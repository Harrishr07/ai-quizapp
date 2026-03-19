// ─────────────────────────────────────────────────────────────
// types/quiz.ts
// Central type definitions for the AI-Powered Quiz Application.
// ─────────────────────────────────────────────────────────────

// ─── Enums / Literals ────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';

export interface QuestionTypeMix {
  multiple_choice: number;
  true_false: number;
  fill_blank: number;
}

/**
 * Lifecycle states of the quiz application.
 * - idle       : No quiz is active; the generator form is shown.
 * - generating : The AI API call is in-flight.
 * - taking     : The user is answering questions.
 * - results    : The quiz is finished and the results page is shown.
 */
export type QuizStatus = 'idle' | 'generating' | 'taking' | 'results';

// ─── Core Domain Types ────────────────────────────────────────

/**
 * Configuration submitted by the user before generation.
 */
export interface QuizConfig {
  /** The topic or subject the quiz should cover. */
  topic: string;
  /** Number of questions to generate (5 – 20). */
  questionCount: number;
  /** Desired difficulty level. */
  difficulty: Difficulty;
  /** Percentage mix of question formats (must total 100). */
  questionTypeMix?: QuestionTypeMix;
}

/**
 * A single quiz question as returned by the AI and mutated during play.
 */
export interface Question {
  /** Stable unique identifier (e.g. UUID or index-based string). */
  id: string;
  /** The question text displayed to the user. */
  text: string;
  /** Question format for rendering/evaluation. */
  type: QuestionType;
  /** Answer options (2 for true/false, 4 for MCQ, empty for fill-in). */
  options: string[];
  /**
   * The text of the correct option.
   * Must be one of the strings present in `options`.
   */
  correctAnswer: string;
  /**
   * The text of the option the user selected.
   * `null` means the question has not been answered yet.
   */
  userSelectedAnswer: string | null;
  /**
   * Whether the user's answer was correct.
   * `null` until the quiz is submitted / results calculated.
   */
  isCorrect: boolean | null;
  /** Optional hint shown when the user requests help. */
  hint?: string;
  /** Whether the user used a hint for this question. */
  hintUsed?: boolean;
  /** Explanation shown after quiz completion. */
  explanation?: string;
  /** Alternate acceptable answers for fill-in-the-blank matching. */
  acceptableAnswers?: string[];
  /** Whether user flagged this question for later review. */
  markedForReview?: boolean;
  /** Whether the question has been opened/viewed during this attempt. */
  visited?: boolean;
}

// ─── Store / State Types ──────────────────────────────────────

/**
 * Shape of the persisted Zustand store.
 */
export interface QuizState {
  // ── Status ─────────────────────────────────────────────────
  status: QuizStatus;

  // ── Current quiz data ───────────────────────────────────────
  config: QuizConfig | null;
  questions: Question[];
  /** 0-based index of the currently displayed question. */
  currentQuestionIndex: number;
  /** Final score (number of correct answers). Populated after submission. */
  score: number | null;
  /** ISO string of when the quiz started (questions loaded). */
  startedAt: string | null;
  /** Duration allowed for the active quiz in seconds. */
  quizDurationSeconds: number | null;
  /** ISO string of when the quiz was submitted. */
  finishedAt: string | null;
  /** True when the quiz ended because the timer reached zero. */
  timeLimitReached: boolean;
  /** Number of times the quiz tab/app focus was lost during an attempt. */
  tabSwitchCount: number;
  /** Email of the currently signed-in player. */
  currentUserEmail: string | null;

  // ── Error state ─────────────────────────────────────────────
  error: string | null;

  // ── History ─────────────────────────────────────────────────
  history: QuizAttempt[];

  // ── Actions ─────────────────────────────────────────────────
  setConfig: (config: QuizConfig) => void;
  setStatus: (status: QuizStatus) => void;
  setHistory: (history: QuizAttempt[]) => void;
  setCurrentUserEmail: (email: string | null) => void;
  setError: (error: string | null) => void;
  fetchHistory: () => Promise<void>;
  generateQuiz: (config: QuizConfig) => Promise<void>;
  loadQuestions: (questions: Question[]) => void;
  markHintUsed: (questionId: string) => void;
  toggleMarkForReview: (questionId: string) => void;
  answerQuestion: (questionId: string, selectedAnswer: string) => void;
  clearQuestionAnswer: (questionId: string) => void;
  incrementTabSwitchCount: () => number;
  navigateToQuestion: (index: number) => void;
  calculateResults: () => void;
  resetQuiz: () => void;
  clearHistory: () => void;
  deleteAttempt: (attemptId: string) => void;
}

// ─── History Types ────────────────────────────────────────────

/**
 * A snapshot of a completed quiz saved to localStorage history.
 */
export interface QuizAttempt {
  /** UUID for the attempt. */
  id: string;
  /** Configuration that generated this quiz. */
  config: QuizConfig;
  /** All questions with user answers populated. */
  questions: Question[];
  /** Number of correct answers. */
  score: number;
  /** Total questions in the attempt. */
  totalQuestions: number;
  /** Percentage score (0 – 100). */
  percentage: number;
  /** Duration in seconds. */
  timeTakenSeconds: number;
  /** Number of points deducted due to hint usage. */
  hintPenalty: number;
  /** Score after hint penalty deduction. */
  adjustedScore: number;
  /** ISO string timestamp of completion. */
  completedAt: string;
  /** Email of the player who completed this attempt. */
  userEmail: string;
}

// ─── API Types ────────────────────────────────────────────────

/**
 * Request body sent to `POST /api/generate-quiz`.
 */
export interface GenerateQuizRequest {
  config: QuizConfig;
}

/**
 * Successful response shape from `POST /api/generate-quiz`.
 */
export interface GenerateQuizResponse {
  questions: Question[];
}

/**
 * Error response shape for any API route.
 */
export interface ApiErrorResponse {
  error: string;
  code?: 'RATE_LIMIT' | 'INVALID_RESPONSE' | 'INVALID_CONFIG' | 'INTERNAL_ERROR';
}

// ─── UI / Component Helper Types ─────────────────────────────

/** Sorting options for the Quiz History dashboard. */
export type HistorySortField = 'completedAt' | 'percentage' | 'timeTakenSeconds';
export type SortDirection = 'asc' | 'desc';

export interface HistoryFilters {
  difficulty: Difficulty | 'all';
  minPercentage: number;
  maxPercentage: number;
}

export interface HistorySortConfig {
  field: HistorySortField;
  direction: SortDirection;
}
