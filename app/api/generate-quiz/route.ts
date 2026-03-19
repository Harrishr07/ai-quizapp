/**
 * app/api/generate-quiz/route.ts
 * POST /api/generate-quiz
 *
 * Proxy route between the client and any OpenAI-compatible LLM API.
 * Plug in your API key via the OPENAI_API_KEY environment variable.
 * Point OPENAI_BASE_URL at any compatible endpoint (default: OpenAI).
 */

import { NextRequest, NextResponse } from 'next/server';
import { type QuizConfig, type Question, type ApiErrorResponse } from '@/types/quiz';
import { generateId } from '@/lib/utils';

// ─── Environment ──────────────────────────────────────────────

const API_KEY  = process.env.OPENAI_API_KEY  ?? '';
const BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const MODEL    = process.env.OPENAI_MODEL    ?? 'gpt-4o-mini';
const CACHE_TTL_MS = 10 * 60 * 1000;

const quizResponseCache = new Map<string, { expiresAt: number; questions: Question[] }>();

// ─── Retry helper ─────────────────────────────────────────────

const RETRY_DELAYS_MS = [2_000, 4_000]; // 2 s then 4 s

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type LLMResult =
  | { ok: true;  text: string }
  | { ok: false; status: number; rateLimited: boolean };

async function callLLMWithRetry(body: string): Promise<LLMResult> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body,
      });

      if (response.status === 429) {
        if (attempt < RETRY_DELAYS_MS.length) {
          console.warn(`[generate-quiz] Rate limited (attempt ${attempt + 1}), retrying in ${RETRY_DELAYS_MS[attempt]}ms…`);
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        return { ok: false, status: 429, rateLimited: true };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[generate-quiz] HTTP ${response.status} error response:`, errorText.slice(0, 500));
        return { ok: false, status: response.status, rateLimited: false };
      }

      type ChatCompletionResponse = {
        choices: Array<{ message: { content: string | null } }>;
      };
      const completion = (await response.json()) as ChatCompletionResponse;
      return { ok: true, text: completion.choices?.[0]?.message?.content ?? '' };
    } catch (fetchError) {
      console.error(`[generate-quiz] Fetch error on attempt ${attempt + 1}:`, fetchError);
      if (attempt === RETRY_DELAYS_MS.length) {
        throw fetchError;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  return { ok: false, status: 429, rateLimited: true };
}

// ─── System Prompt ────────────────────────────────────────────

function buildSystemPrompt(config: QuizConfig): string {
  const mix = config.questionTypeMix ?? {
    multiple_choice: 60,
    true_false: 20,
    fill_blank: 20,
  };

  return `You are a quiz-generation assistant. Your ONLY job is to output a valid JSON array — nothing else.

TASK: Generate exactly ${config.questionCount} quiz questions about the topic: "${config.topic}".
Mix question types: multiple_choice, true_false, fill_blank.
Ensure at least one true_false and one fill_blank when questionCount >= 6.
Target distribution:
- multiple_choice: ${mix.multiple_choice}%
- true_false: ${mix.true_false}%
- fill_blank: ${mix.fill_blank}%

DIFFICULTY LEVEL: ${config.difficulty.toUpperCase()}
- easy:   straightforward factual questions with one obvious correct answer.
- medium: requires understanding of concepts; some plausible distractors.
- hard:   nuanced, edge-case questions; all distractors must be plausible.

OUTPUT FORMAT RULES (MUST follow exactly):
1. Output ONLY a raw JSON array. Do NOT include markdown code fences, explanations, or any other text.
2. The array must contain exactly ${config.questionCount} objects.
3. Each object MUST match this exact shape:
{
  "id": "<unique string, e.g. q1, q2 …>",
  "type": "multiple_choice | true_false | fill_blank",
  "text": "<the question text>",
  "options": ["...depends on type..."],
  "correctAnswer": "<must be the exact text of one of the four options>",
  "acceptableAnswers": ["<optional aliases mainly for fill_blank>"]
  "hint": "<short hint that helps but does not reveal full answer>",
  "explanation": "<1-2 lines explaining why answer is correct>",
  "userSelectedAnswer": null,
  "isCorrect": null
}

CONTENT RULES:
- multiple_choice: exactly 4 distinct options.
- true_false: options MUST be ["True", "False"].
- fill_blank: options MUST be [] and include acceptableAnswers.
- correctAnswer must match one of options for multiple_choice/true_false.
- Do not repeat questions.
- Do not include the answer key in the question text.

If you cannot comply with these rules, output an empty array: []`;
}

// ─── Response Validator ───────────────────────────────────────

function isValidQuestionsArray(data: unknown): data is Question[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      ['multiple_choice', 'true_false', 'fill_blank'].includes(
        String((item as Record<string, unknown>).type)
      ) &&
      typeof (item as Record<string, unknown>).text === 'string' &&
      Array.isArray((item as Record<string, unknown>).options) &&
      ((item as Record<string, unknown>).options as unknown[]).every(
        (o) => typeof o === 'string'
      ) &&
      typeof (item as Record<string, unknown>).correctAnswer === 'string' &&
      typeof (item as Record<string, unknown>).hint === 'string' &&
      typeof (item as Record<string, unknown>).explanation === 'string' &&
      (
        ((item as Record<string, unknown>).type === 'multiple_choice' &&
          ((item as Record<string, unknown>).options as string[]).length === 4 &&
          ((item as Record<string, unknown>).options as string[]).includes(
            (item as Record<string, unknown>).correctAnswer as string
          )) ||
        ((item as Record<string, unknown>).type === 'true_false' &&
          JSON.stringify((item as Record<string, unknown>).options) === JSON.stringify(['True', 'False']) &&
          ['True', 'False'].includes((item as Record<string, unknown>).correctAnswer as string)) ||
        ((item as Record<string, unknown>).type === 'fill_blank' &&
          ((item as Record<string, unknown>).options as string[]).length === 0)
      )
  );
}

// ─── POST Handler ─────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── ENV CHECK ──────────────────────────────────────────────
  console.log('[generate-quiz] API_KEY loaded:', API_KEY ? 'FOUND IT' : 'MISSING');
  console.log('[generate-quiz] BASE_URL:', BASE_URL);
  console.log('[generate-quiz] MODEL:', MODEL);

  // ── 1. Parse and validate request body ─────────────────────
  let config: QuizConfig;
  try {
    const body = (await request.json()) as { config?: QuizConfig };
    config = body.config as QuizConfig;

    if (
      !config?.topic?.trim() ||
      typeof config.questionCount !== 'number' ||
      config.questionCount < 5 ||
      config.questionCount > 20 ||
      !['easy', 'medium', 'hard'].includes(config.difficulty)
    ) {
      const errBody: ApiErrorResponse = {
        error: 'Invalid quiz configuration provided.',
        code: 'INVALID_CONFIG',
      };
      return NextResponse.json(errBody, { status: 400 });
    }

    if (config.questionTypeMix) {
      const mix = config.questionTypeMix;
      const values = [mix.multiple_choice, mix.true_false, mix.fill_blank];
      const validRange = values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100);
      const mixTotal = values.reduce((sum, value) => sum + value, 0);
      if (!validRange || mixTotal !== 100) {
        const errBody: ApiErrorResponse = {
          error: 'Question type mix must be between 0-100 for each type and total exactly 100.',
          code: 'INVALID_CONFIG',
        };
        return NextResponse.json(errBody, { status: 400 });
      }
    }
  } catch {
    const errBody: ApiErrorResponse = {
      error: 'Malformed request body.',
      code: 'INVALID_CONFIG',
    };
    return NextResponse.json(errBody, { status: 400 });
  }

  // ── 2. Guard: require API key ───────────────────────────────
  if (!API_KEY) {
    const errBody: ApiErrorResponse = {
      error: 'Server is missing OPENAI_API_KEY. Please configure your .env.local file.',
      code: 'INTERNAL_ERROR',
    };
    return NextResponse.json(errBody, { status: 500 });
  }

  // ── 3. Call the LLM (with automatic retry on 429) ──────────
  const cacheKey = JSON.stringify({
    topic: config.topic.trim().toLowerCase(),
    difficulty: config.difficulty,
    questionCount: config.questionCount,
    questionTypeMix: config.questionTypeMix,
    model: MODEL,
  });
  const cached = quizResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ questions: cached.questions }, { status: 200 });
  }

  let rawText: string;
  try {
    const llmBody = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(config) },
        {
          role: 'user',
          content: `Generate ${config.questionCount} ${config.difficulty} questions about: ${config.topic}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const result = await callLLMWithRetry(llmBody);

    if (!result.ok) {
      console.error('[generate-quiz] LLM call failed with status:', result.status);
      if (result.rateLimited) {
        const errBody: ApiErrorResponse = {
          error: 'The AI provider is busy right now. Please wait 10–15 seconds and try again.',
          code: 'RATE_LIMIT',
        };
        return NextResponse.json(errBody, { status: 429 });
      }
      const errBody: ApiErrorResponse = {
        error: `AI service error (HTTP ${result.status}). Please try again.`,
        code: 'INTERNAL_ERROR',
      };
      return NextResponse.json(errBody, { status: 502 });
    }

    rawText = result.text;
  } catch (networkError) {
    console.error('[generate-quiz] Network error calling AI API:', networkError);
    const errBody: ApiErrorResponse = {
      error: 'Failed to reach the AI service. Check your network connection.',
      code: 'INTERNAL_ERROR',
    };
    return NextResponse.json(errBody, { status: 502 });
  }

  // ── 4. Parse and validate the AI response ──────────────────
  let questions: Question[];
  try {
    // The AI might wrap the array inside a JSON object key (json_object mode)
    const parsed: unknown = JSON.parse(rawText.trim());
    let candidate: unknown = parsed;

    // Unwrap { questions: [...] } or { data: [...] } patterns
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      const obj = parsed as Record<string, unknown>;
      candidate = obj.questions ?? obj.data ?? obj.quiz ?? Object.values(obj)[0];
    }

    if (!isValidQuestionsArray(candidate)) {
      console.error('[generate-quiz] Invalid AI response structure:', rawText.slice(0, 500));
      const errBody: ApiErrorResponse = {
        error: 'The AI returned an unexpected format. Please try again.',
        code: 'INVALID_RESPONSE',
      };
      return NextResponse.json(errBody, { status: 422 });
    }

    // Stamp guaranteed-unique IDs and sanitize nullable fields
    questions = candidate.map((q) => ({
      ...q,
      id: q.id || generateId(),
      // Ensure these are always null from the server (client sets them)
      userSelectedAnswer: null,
      isCorrect: null,
      options: q.options as string[],
      type: q.type,
      hint: q.hint,
      explanation: q.explanation,
      acceptableAnswers: (q.acceptableAnswers as string[] | undefined) ?? [],
      hintUsed: false,
      text: q.text.trim(),
      correctAnswer: q.correctAnswer.trim(),
    }));

    // Final count guard
    if (questions.length !== config.questionCount) {
      // Trim or reject if the AI returned the wrong count
      if (questions.length > config.questionCount) {
        questions = questions.slice(0, config.questionCount);
      } else {
        const errBody: ApiErrorResponse = {
          error: `AI returned ${questions.length} questions instead of ${config.questionCount}. Please try again.`,
          code: 'INVALID_RESPONSE',
        };
        return NextResponse.json(errBody, { status: 422 });
      }
    }
  } catch (parseError) {
    console.error('[generate-quiz] JSON parse error:', parseError, '\nRaw:', rawText.slice(0, 500));
    const errBody: ApiErrorResponse = {
      error: 'The AI response could not be parsed. Please try again.',
      code: 'INVALID_RESPONSE',
    };
    return NextResponse.json(errBody, { status: 422 });
  }

  // ── 5. Return validated questions ──────────────────────────
  quizResponseCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    questions,
  });
  return NextResponse.json({ questions }, { status: 200 });
}
