/**
 * lib/constants.ts
 * Application-wide constants — avoids magic numbers/strings scattered in components.
 */

import { type Difficulty } from '@/types/quiz';

/** Inclusive question count limits for the generator form. */
export const QUESTION_COUNT = {
  MIN: 5,
  MAX: 20,
  DEFAULT: 10,
} as const;

/** Available difficulty options for the select input. */
export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy',   label: '🟢 Easy'   },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'hard',   label: '🔴 Hard'   },
];

/** Zustand persist storage key. */
export const STORE_PERSIST_KEY = 'ai-quiz-store';

/** Maximum number of historical attempts kept in localStorage. */
export const MAX_HISTORY_ITEMS = 50;

/** Milliseconds to debounce filter inputs in the history dashboard. */
export const FILTER_DEBOUNCE_MS = 300;

/** Seconds allocated per generated question for the active quiz timer. */
export const TIME_LIMIT_PER_QUESTION_SECONDS = 30;

/** Points deducted from the final score for each used hint. */
export const HINT_PENALTY_POINTS = 0.5;

/** Difficulty-aware timer allocation (seconds per question). */
export const DIFFICULTY_TIME_LIMIT_PER_QUESTION_SECONDS: Record<Difficulty, number> = {
  easy: 30,
  medium: 45,
  hard: 60,
};

/** Maximum focus-loss events allowed during a quiz attempt before auto-submit. */
export const QUIZ_INTEGRITY_MAX_TAB_SWITCHES = 3;

/** Ignore duplicate blur/visibility events fired in rapid succession. */
export const QUIZ_INTEGRITY_EVENT_DEBOUNCE_MS = 1200;
