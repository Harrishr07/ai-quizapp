import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.OPENAI_API_KEY ?? '';
const BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const CACHE_TTL_MS = 10 * 60 * 1000;

const followUpCache = new Map<string, { expiresAt: number; answer: string }>();

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'Server is missing OPENAI_API_KEY.' }, { status: 500 });
  }

  let topic = '';
  let question = '';
  try {
    const body = (await request.json()) as { topic?: string; question?: string };
    topic = body.topic?.trim() ?? '';
    question = body.question?.trim() ?? '';
    if (!topic || !question) {
      return NextResponse.json({ error: 'Topic and question are required.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const cacheKey = JSON.stringify({ topic: topic.toLowerCase(), question: question.toLowerCase() });
  const cached = followUpCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ answer: cached.answer }, { status: 200 });
  }

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful quiz tutor. Answer clearly in 3-6 lines with practical clarity, examples when useful, and no markdown tables.',
          },
          {
            role: 'user',
            content: `Topic: ${topic}\nFollow-up question: ${question}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `AI service error: ${errText.slice(0, 180)}` }, { status: 502 });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const answer = data.choices?.[0]?.message?.content?.trim() ?? 'No answer generated.';

    followUpCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      answer,
    });

    return NextResponse.json({ answer }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to reach AI service.' }, { status: 502 });
  }
}
