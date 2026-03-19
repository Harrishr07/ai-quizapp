/**
 * store/useQuizStore.ts
 * Zustand store for the AI Quiz Application.
 * Persisted to localStorage via the 'persist' middleware.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type QuizState,
  type QuizConfig,
  type QuizStatus,
  type Question,
  type QuizAttempt,
  type GenerateQuizResponse,
  type ApiErrorResponse,
} from '@/types/quiz';
import { generateId } from '@/lib/utils';
import {
  STORE_PERSIST_KEY,
  MAX_HISTORY_ITEMS,
  DIFFICULTY_TIME_LIMIT_PER_QUESTION_SECONDS,
  TIME_LIMIT_PER_QUESTION_SECONDS,
  HINT_PENALTY_POINTS,
} from '@/lib/constants';

// ─── Initial (reset) state values ────────────────────────────

const initialState = {
  status: 'idle' as QuizStatus,
  config: null,
  questions: [] as Question[],
  currentQuestionIndex: 0,
  score: null,
  startedAt: null,
  quizDurationSeconds: null,
  finishedAt: null,
  timeLimitReached: false,
  tabSwitchCount: 0,
  currentUserEmail: null,
  error: null,
};

// ─── Store creation ───────────────────────────────────────────

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────
      ...initialState,
      history: [],

      // ── Actions ────────────────────────────────────────────

      /**
       * Store the user's quiz configuration and move to generating state.
       */
      setConfig: (config: QuizConfig) =>
        set({ config, status: 'generating', error: null }),

      /**
       * Directly set the quiz lifecycle status.
       */
      setStatus: (status: QuizStatus) => set({ status }),

      /**
       * Replace local history cache with server-sourced attempts.
       */
      setHistory: (history: QuizAttempt[]) => set({ history }),

      /**
       * Track the currently authenticated player for user-scoped history.
       */
      setCurrentUserEmail: (email: string | null) => set({ currentUserEmail: email }),

      /**
       * Store an error message (displayed by ErrorBoundary / StatusBar).
       * Pass null to clear the error.
       */
      setError: (error: string | null) =>
        set({ error, status: error ? 'idle' : get().status }),

      /**
       * Load current user's quiz history from the server.
       */
      fetchHistory: async () => {
        try {
          const response = await fetch('/api/history', { method: 'GET' });
          if (!response.ok) return;
          const data = (await response.json()) as { attempts?: QuizAttempt[] };
          set({ history: data.attempts ?? [] });
        } catch {
          // Keep local cache if fetch fails.
        }
      },

      /**
       * Generate quiz questions via the app API.
       * Keeps API concerns inside the store so the UI can retry consistently.
       */
      generateQuiz: async (config: QuizConfig) => {
        set({ config, status: 'generating', error: null });

        try {
          const response = await fetch('/api/generate-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config }),
          });

          const data = (await response.json()) as GenerateQuizResponse | ApiErrorResponse;

          if (!response.ok) {
            const apiError = data as ApiErrorResponse;
            set({
              error: apiError.error ?? 'An unexpected error occurred. Please try again.',
              status: 'idle',
            });
            return;
          }

          const { questions } = data as GenerateQuizResponse;
          get().loadQuestions(questions);
        } catch {
          set({
            error: 'Network error — please check your connection and try again.',
            status: 'idle',
          });
        }
      },

      /**
       * Populate the question list after AI generation.
       * Transitions status → 'taking'.
       */
      loadQuestions: (questions: Question[]) =>
        set((state) => {
          const selectedDifficulty = state.config?.difficulty;
          const secondsPerQuestion = selectedDifficulty
            ? DIFFICULTY_TIME_LIMIT_PER_QUESTION_SECONDS[selectedDifficulty]
            : TIME_LIMIT_PER_QUESTION_SECONDS;

          return {
            questions: questions.map((q, idx) => ({
              ...q,
              hintUsed: q.hintUsed ?? false,
              markedForReview: q.markedForReview ?? false,
              visited: idx === 0,
            })),
            currentQuestionIndex: 0,
            score: null,
            finishedAt: null,
            status: 'taking',
            startedAt: new Date().toISOString(),
            quizDurationSeconds: questions.length * secondsPerQuestion,
            timeLimitReached: false,
            tabSwitchCount: 0,
            error: null,
          };
        }),

      /**
       * Mark a hint as used for a question (score penalty applied at submit time).
       */
      markHintUsed: (questionId: string) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId ? { ...q, hintUsed: true } : q
          ),
        })),

      /**
       * Toggle mark-for-review flag on a question.
       */
      toggleMarkForReview: (questionId: string) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId
              ? { ...q, markedForReview: !q.markedForReview }
              : q
          ),
        })),

      /**
       * Record the user's answer for a specific question.
       * Does NOT finalize isCorrect — that happens in calculateResults().
       */
      answerQuestion: (questionId: string, selectedAnswer: string) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId
              ? { ...q, userSelectedAnswer: selectedAnswer.trim() ? selectedAnswer : null }
              : q
          ),
        })),

      /**
       * Clear the user's answer for a specific question.
       */
      clearQuestionAnswer: (questionId: string) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId
              ? { ...q, userSelectedAnswer: null }
              : q
          ),
        })),

      /**
       * Increment and return the tab/focus switch count for quiz integrity.
       */
      incrementTabSwitchCount: () => {
        let nextCount = 0;
        set((state) => {
          nextCount = state.tabSwitchCount + 1;
          return { tabSwitchCount: nextCount };
        });
        return nextCount;
      },

      /**
       * Navigate to an arbitrary question by 0-based index.
       */
      navigateToQuestion: (index: number) => {
        const { questions } = get();
        if (index >= 0 && index < questions.length) {
          set((state) => ({
            currentQuestionIndex: index,
            questions: state.questions.map((q, i) =>
              i === index ? { ...q, visited: true } : q
            ),
          }));
        }
      },

      /**
       * Compute isCorrect for every question, tally the score,
       * save attempt to history, and transition → 'results'.
       */
      calculateResults: () => {
        const {
          questions,
          config,
          startedAt,
          history,
          quizDurationSeconds,
          currentUserEmail,
        } = get();

        if (!config || !startedAt) return;

        const finishedAt = new Date().toISOString();
        const startMs = new Date(startedAt).getTime();
        const finishMs = new Date(finishedAt).getTime();
        const timeTakenSeconds = Math.round((finishMs - startMs) / 1000);
        const timeLimitReached =
          typeof quizDurationSeconds === 'number' && timeTakenSeconds >= quizDurationSeconds;

        const normalize = (value: string) => value.trim().toLowerCase();
        const evaluated: Question[] = questions.map((q) => {
          const userAnswer = q.userSelectedAnswer;
          const normalizedUser = userAnswer ? normalize(userAnswer) : null;
          const acceptable = [q.correctAnswer, ...(q.acceptableAnswers ?? [])].map(normalize);
          const isCorrect = normalizedUser ? acceptable.includes(normalizedUser) : false;
          return {
            ...q,
            isCorrect,
          };
        });

        const rawScore = evaluated.filter((q) => q.isCorrect).length;
        const hintPenalty = evaluated.filter((q) => q.hintUsed).length * HINT_PENALTY_POINTS;
        const score = Math.max(0, rawScore - hintPenalty);
        const percentage = Math.round((score / evaluated.length) * 100);

        const attempt = currentUserEmail
          ? {
              id: generateId(),
              config,
              questions: evaluated,
              score,
              hintPenalty,
              adjustedScore: score,
              totalQuestions: evaluated.length,
              percentage,
              timeTakenSeconds,
              completedAt: finishedAt,
              userEmail: currentUserEmail,
            } satisfies QuizAttempt
          : null;

        // Keep history capped at MAX_HISTORY_ITEMS (most recent first) when user context exists.
        const updatedHistory = attempt
          ? [attempt, ...history].slice(0, MAX_HISTORY_ITEMS)
          : history;

        set({
          questions: evaluated,
          score,
          finishedAt,
          timeLimitReached,
          status: 'results',
          history: updatedHistory,
        });

        if (attempt) {
          void fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attempt }),
          });
        }
      },

      /**
       * Reset the active quiz back to idle, preserving history.
       */
      resetQuiz: () =>
        set({ ...initialState }),

      /**
       * Wipe all quiz history from the store (and localStorage).
       */
      clearHistory: () =>
        set((state) => {
          void fetch('/api/history', { method: 'DELETE' });
          return {
            history: state.currentUserEmail
              ? state.history.filter((a) => a.userEmail !== state.currentUserEmail)
              : state.history,
          };
        }),

      /**
       * Remove a single attempt from history by its ID.
       */
      deleteAttempt: (attemptId: string) =>
        set((state) => {
          void fetch(`/api/history?attemptId=${encodeURIComponent(attemptId)}`, {
            method: 'DELETE',
          });
          return {
            history: state.history.filter((a) => a.id !== attemptId),
          };
        }),
    }),
    {
      name: STORE_PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist history and the current quiz progress.
      // Exclude transient UI states on the assumption that a page refresh
      // should gracefully resume a quiz in-progress.
      partialize: (state) => ({
        history: state.history,
        // Persist active quiz so users can resume after a refresh
        status: state.status,
        config: state.config,
        questions: state.questions,
        currentQuestionIndex: state.currentQuestionIndex,
        startedAt: state.startedAt,
        quizDurationSeconds: state.quizDurationSeconds,
        tabSwitchCount: state.tabSwitchCount,
      }),
    }
  )
);
