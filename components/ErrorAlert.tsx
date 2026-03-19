'use client';

/**
 * components/ErrorAlert.tsx
 * Inline error/info banner displayed when the store has an error string.
 */

import { useQuizStore } from '@/store';

function getErrorPresentation(error: string) {
  const normalized = error.toLowerCase();

  if (normalized.includes('network')) {
    return {
      tone: 'Network',
      title: 'Network problem',
      hint: 'The app could not reach the quiz service. Check your connection and try again.',
      canRetry: true,
    };
  }

  if (normalized.includes('rate limit')) {
    return {
      tone: 'Rate limit',
      title: 'Rate limit reached',
      hint: 'The AI provider asked us to slow down. Wait a moment, then retry the request.',
      canRetry: true,
    };
  }

  if (normalized.includes('invalid') || normalized.includes('parsed') || normalized.includes('unexpected format')) {
    return {
      tone: 'Generation',
      title: 'Quiz generation failed',
      hint: 'The AI response was unusable. Retrying will request a fresh set of questions.',
      canRetry: true,
    };
  }

  if (normalized.includes('server') || normalized.includes('service') || normalized.includes('http')) {
    return {
      tone: 'Service',
      title: 'Service unavailable',
      hint: 'The quiz API returned an error. You can retry or clear the current draft.',
      canRetry: true,
    };
  }

  return {
    tone: 'Error',
    title: 'Something went wrong',
    hint: 'Try again or dismiss this message to continue using the app.',
    canRetry: false,
  };
}

export default function ErrorAlert() {
  const { error, config, status, generateQuiz, resetQuiz, setError } = useQuizStore();

  if (!error) return null;

  const presentation = getErrorPresentation(error);
  const canRetry = presentation.canRetry && Boolean(config) && status !== 'generating';

  return (
    <div
      role="alert"
      className="w-full max-w-2xl mx-auto px-4"
    >
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-start gap-3">
          <span className="h-6 min-w-6 px-2 rounded-md bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[11px] font-semibold tracking-wide uppercase flex items-center justify-center">
            {presentation.tone}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{presentation.title}</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">{error}</p>
            <p className="text-xs text-red-500 dark:text-red-300/80 mt-2">{presentation.hint}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError(null)}
            className="text-red-300 hover:text-red-500 dark:text-red-600 dark:hover:text-red-400 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {canRetry && config && (
            <button
              type="button"
              onClick={() => {
                void generateQuiz(config);
              }}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              resetQuiz();
              setError(null);
            }}
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm font-semibold hover:bg-red-100/70 dark:hover:bg-red-900/30 transition-colors"
          >
            Clear quiz state
          </button>
        </div>
      </div>
    </div>
  );
}
