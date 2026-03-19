'use client';

/**
 * components/QuizTaker.tsx
 * One-question-at-a-time quiz interface with a progress bar,
 * option selection, and prev/next navigation.
 */

import { useQuizStore } from '@/store';
import { type Question } from '@/types/quiz';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDuration } from '@/lib/utils';
import {
  HINT_PENALTY_POINTS,
  QUIZ_INTEGRITY_EVENT_DEBOUNCE_MS,
  QUIZ_INTEGRITY_MAX_TAB_SWITCHES,
} from '@/lib/constants';

// ─── Option button sub-component ─────────────────────────────

interface OptionButtonProps {
  option: string;
  questionId: string;
  isSelected: boolean;
  onSelect: (questionId: string, answer: string) => void;
  optionIndex: number;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

function OptionButton({ option, questionId, isSelected, onSelect, optionIndex }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(questionId, option)}
      className={`w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border-2 text-left font-medium transition-all duration-200 group
        ${
          isSelected
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 shadow-md'
            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40'
        }`}
    >
      <span
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors
          ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600'
          }`}
      >
        {OPTION_LABELS[optionIndex]}
      </span>
      <span className="text-sm leading-relaxed break-words">{option}</span>
    </button>
  );
}

// ─── Progress bar sub-component ───────────────────────────────

interface ProgressBarProps {
  current: number; // 1-based
  total: number;
  answered: number;
}

function ProgressBar({ current, total, answered }: ProgressBarProps) {
  const completionPct = Math.round((answered / total) * 100);
  const navPct = Math.round((current / total) * 100);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap justify-between items-center gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span>Question {current} of {total}</span>
        <span>{answered} answered · {completionPct}% complete</span>
      </div>
      {/* Navigation progress (current position) */}
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
        {/* Answered fill (lighter) */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-200 dark:bg-blue-900/60 rounded-full transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
        {/* Navigation fill (solid) */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${navPct}%` }}
        />
      </div>
    </div>
  );
}

interface QuestionStatusPanelProps {
  questions: Question[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

function QuestionStatusPanel({ questions, currentIndex, onNavigate }: QuestionStatusPanelProps) {
  const answeredCount = questions.filter((q) => Boolean(q.userSelectedAnswer?.trim())).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = questions.filter((q) => q.markedForReview).length;

  return (
    <aside className="w-full lg:w-56 xl:w-60 shrink-0 lg:sticky lg:top-20 self-start rounded-3xl border border-slate-200/80 dark:border-slate-700/90 bg-white/95 dark:bg-slate-800/95 shadow-xl shadow-slate-200/40 dark:shadow-slate-950/30 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-extrabold tracking-wide text-slate-900 dark:text-white">Question Panel</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Round buttons, click to jump.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Answered</p>
          <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-200">{answeredCount}</p>
        </div>
        <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/60 px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">Not Answered</p>
          <p className="text-sm font-extrabold text-red-700 dark:text-red-200">{unansweredCount}</p>
        </div>
        <div className="col-span-2 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200/80 dark:border-violet-800/60 px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Marked</p>
          <p className="text-sm font-extrabold text-violet-700 dark:text-violet-200">{markedCount}</p>
        </div>
      </div>

      <div className="max-h-[44vh] lg:max-h-[50vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-2">
        {questions.map((q, i) => {
          const isCurrent = i === currentIndex;
          const isVisited = Boolean(q.visited);
          const isAnswered = Boolean(q.userSelectedAnswer?.trim());
          const isMarked = Boolean(q.markedForReview);

          const tone =
            !isVisited
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
              : isAnswered && isMarked
              ? 'bg-pink-500 text-white border-pink-500'
              : isMarked
              ? 'bg-violet-500 text-white border-violet-500'
              : isAnswered
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-red-500 text-white border-red-500';

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onNavigate(i)}
              className={`h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11 rounded-full border-2 text-[11px] sm:text-[12px] font-extrabold transition-all duration-200 ${tone} ${isCurrent ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-slate-800 shadow-md' : 'hover:-translate-y-0.5 hover:shadow'}`}
              aria-label={`Question ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-3">
        <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-emerald-500" />Answered</div>
        <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-red-500" />Not answered</div>
        <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-violet-500" />Mark review</div>
        <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-pink-500" />Answered + mark</div>
      </div>
    </aside>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function QuizTaker() {
  const {
    questions,
    currentQuestionIndex,
    config,
    startedAt,
    quizDurationSeconds,
    markHintUsed,
    toggleMarkForReview,
    answerQuestion,
    clearQuestionAnswer,
    tabSwitchCount,
    incrementTabSwitchCount,
    navigateToQuestion,
    calculateResults,
  } = useQuizStore();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasAutoSubmittedRef = useRef(false);
  const lastIntegrityEventMsRef = useRef(0);

  const question = questions[currentQuestionIndex];
  const isFirst = currentQuestionIndex === 0;
  const isLast = currentQuestionIndex === questions.length - 1;
  const answeredCount = questions.filter((q) => Boolean(q.userSelectedAnswer?.trim())).length;
  const allAnswered = answeredCount === questions.length;
  const hintsUsedCount = questions.filter((q) => q.hintUsed).length;
  const hintPenalty = hintsUsedCount * HINT_PENALTY_POINTS;

  const endTimeMs = useMemo(() => {
    if (!startedAt || typeof quizDurationSeconds !== 'number') return null;
    return new Date(startedAt).getTime() + quizDurationSeconds * 1000;
  }, [startedAt, quizDurationSeconds]);

  const secondsLeft = endTimeMs
    ? Math.max(0, Math.ceil((endTimeMs - nowMs) / 1000))
    : null;
  const isLowTime = typeof secondsLeft === 'number' && secondsLeft <= 60;

  useEffect(() => {
    hasAutoSubmittedRef.current = false;
    lastIntegrityEventMsRef.current = 0;
  }, [startedAt]);

  useEffect(() => {
    if (!endTimeMs) return;

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endTimeMs]);

  useEffect(() => {
    if (secondsLeft !== 0 || hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;
    calculateResults();
  }, [secondsLeft, calculateResults]);

  useEffect(() => {
    const registerViolation = () => {
      const now = Date.now();
      if (now - lastIntegrityEventMsRef.current < QUIZ_INTEGRITY_EVENT_DEBOUNCE_MS) {
        return;
      }
      lastIntegrityEventMsRef.current = now;

      const nextCount = incrementTabSwitchCount();
      if (nextCount >= QUIZ_INTEGRITY_MAX_TAB_SWITCHES && !hasAutoSubmittedRef.current) {
        hasAutoSubmittedRef.current = true;
        calculateResults();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        registerViolation();
      }
    };

    const handleWindowBlur = () => {
      registerViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [incrementTabSwitchCount, calculateResults]);

  if (!question) return null;

  const requiresTypedAnswer = question.type === 'fill_blank';
  const tabSwitchesLeft = Math.max(0, QUIZ_INTEGRITY_MAX_TAB_SWITCHES - tabSwitchCount);

  const handleNext = () => {
    if (isLast) {
      calculateResults();
    } else {
      navigateToQuestion(currentQuestionIndex + 1);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4">
      <div className="flex flex-col gap-4 md:gap-6 lg:flex-row items-start">
      <div className="min-w-0 flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-400">
            {config?.topic ?? 'Quiz'}
          </p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
            {config?.difficulty} Level
          </h2>
          <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
            Hints used: {hintsUsedCount} (final score penalty: -{hintPenalty.toFixed(1)})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              tabSwitchCount === 0
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                : tabSwitchesLeft > 0
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
            }`}
            title="Leaving the quiz tab counts as malpractice and can auto-submit the attempt."
          >
            Tab switches: {tabSwitchCount}/{QUIZ_INTEGRITY_MAX_TAB_SWITCHES}
          </span>
          {/* Quick finish badge */}
          {allAnswered && (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold px-3 py-1 rounded-full border border-green-200 dark:border-green-700">
              All answered
            </span>
          )}
          {secondsLeft !== null && (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                isLowTime
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
              }`}
            >
              Time left: {formatDuration(secondsLeft)}
            </span>
          )}
          <button
            type="button"
            onClick={() => toggleMarkForReview(question.id)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              question.markedForReview
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {question.markedForReview ? 'Marked' : 'Mark for review'}
          </button>
          <button
            type="button"
            onClick={() => clearQuestionAnswer(question.id)}
            disabled={!question.userSelectedAnswer?.trim()}
            className="text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear selection
          </button>
        </div>
      </div>

      {/* Progress */}
      {tabSwitchCount > 0 && (
        <div
          role="alert"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            tabSwitchesLeft > 0
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
          }`}
        >
          {tabSwitchesLeft > 0
            ? `Warning: leaving the quiz tab is tracked. ${tabSwitchesLeft} warning${tabSwitchesLeft === 1 ? '' : 's'} left before auto-submit.`
            : 'Auto-submitting your quiz due to repeated tab switches.'}
        </div>
      )}

      <ProgressBar
        current={currentQuestionIndex + 1}
        total={questions.length}
        answered={answeredCount}
      />

      {/* Question card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-7 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 capitalize">
            {question.type.replace('_', ' ')}
          </span>
          {question.hint && !question.hintUsed && (
            <button
              type="button"
              onClick={() => markHintUsed(question.id)}
              className="text-xs font-semibold px-3 py-1 rounded-full border border-amber-200 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            >
              Use hint (-0.5)
            </button>
          )}
        </div>

        {question.hintUsed && question.hint && (
          <p className="text-sm rounded-2xl px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200">
            Hint: {question.hint}
          </p>
        )}

        <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-relaxed">
          {question.text}
        </p>

        {/* Options / Input */}
        {requiresTypedAnswer ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300" htmlFor={`answer-${question.id}`}>
              Type your answer
            </label>
            <input
              id={`answer-${question.id}`}
              type="text"
              value={question.userSelectedAnswer ?? ''}
              onChange={(event) => answerQuestion(question.id, event.target.value)}
              placeholder="Enter your answer"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <OptionButton
                key={`${question.id}-${idx}`}
                option={option}
                questionId={question.id}
                isSelected={question.userSelectedAnswer === option}
                onSelect={answerQuestion}
                optionIndex={idx}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
          disabled={isFirst}
          className="flex-1 py-3 rounded-2xl font-semibold border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={handleNext}
          className={`w-full sm:flex-1 py-3 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 ${
            isLast
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-green-200 dark:shadow-green-900/40'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-200 dark:shadow-blue-900/40'
          }`}
        >
          {isLast ? 'Finish quiz' : 'Next'}
        </button>
      </div>

      </div>

      <QuestionStatusPanel
        questions={questions}
        currentIndex={currentQuestionIndex}
        onNavigate={navigateToQuestion}
      />
      </div>
    </div>
  );
}
