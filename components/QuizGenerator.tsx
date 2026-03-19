'use client';

/**
 * components/QuizGenerator.tsx
 * The landing form where users configure and launch a quiz.
 * Uses the Zustand store to kick off generation and transitions
 * through the 'generating' status while calling the API.
 */

import { useState, type FormEvent } from 'react';
import { useQuizStore } from '@/store';
import { DIFFICULTY_OPTIONS, QUESTION_COUNT } from '@/lib/constants';
import { type QuizConfig, type Difficulty, type QuestionTypeMix } from '@/types/quiz';

const DEFAULT_QUESTION_TYPE_MIX: QuestionTypeMix = {
  multiple_choice: 60,
  true_false: 20,
  fill_blank: 20,
};

// ─── Loading Skeleton component ───────────────────────────────

function GeneratingSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto animate-pulse space-y-5 px-4">
      <div className="flex flex-col items-center gap-3 py-6">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
        <p className="text-blue-700 dark:text-blue-300 font-semibold text-lg tracking-wide">
          Crafting your quiz…
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Our AI is generating personalised questions for you.
        </p>
      </div>

      {/* Skeleton question cards */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-5 space-y-3"
        >
          <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-3/4" />
          <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-1/2" />
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="h-9 rounded-lg bg-slate-200 dark:bg-slate-700"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function QuizGenerator() {
  const { status, generateQuiz } = useQuizStore();

  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(QUESTION_COUNT.DEFAULT);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionTypeMix, setQuestionTypeMix] = useState<QuestionTypeMix>(DEFAULT_QUESTION_TYPE_MIX);
  const [validationMsg, setValidationMsg] = useState('');

  const isGenerating = status === 'generating';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationMsg('');

    if (!topic.trim()) {
      setValidationMsg('Please enter a topic for your quiz.');
      return;
    }

    const mixTotal = questionTypeMix.multiple_choice + questionTypeMix.true_false + questionTypeMix.fill_blank;
    if (mixTotal !== 100) {
      setValidationMsg('Question type mix must total exactly 100%.');
      return;
    }

    const config: QuizConfig = {
      topic: topic.trim(),
      questionCount,
      difficulty,
      questionTypeMix,
    };

    await generateQuiz(config);
  };

  if (isGenerating) return <GeneratingSkeleton />;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.566A2 2 0 0114 18H10a2 2 0 01-1.789-1.106l-.347-.566z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          AI Quiz Generator
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Enter any topic and let AI craft a personalised quiz for you.
        </p>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 space-y-7"
      >
        {/* Topic */}
        <div className="space-y-2">
          <label htmlFor="topic" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Quiz Topic
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => { setTopic(e.target.value); setValidationMsg(''); }}
            placeholder="e.g. JavaScript, World History, Quantum Physics…"
            disabled={isGenerating}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {validationMsg && (
            <p className="text-sm text-red-500" role="alert">{validationMsg}</p>
          )}
        </div>

        {/* Question count */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label htmlFor="questionCount" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Number of Questions
            </label>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {questionCount}
            </span>
          </div>
          <input
            id="questionCount"
            type="range"
            min={QUESTION_COUNT.MIN}
            max={QUESTION_COUNT.MAX}
            step={1}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            disabled={isGenerating}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{QUESTION_COUNT.MIN}</span>
            <span>{QUESTION_COUNT.MAX}</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Difficulty
          </span>
          <div className="grid grid-cols-3 gap-3" role="group" aria-label="Difficulty">
            {DIFFICULTY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDifficulty(value)}
                disabled={isGenerating}
                className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                  difficulty === value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-md scale-105'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Question type mix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Question Type Mix
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total: {questionTypeMix.multiple_choice + questionTypeMix.true_false + questionTypeMix.fill_blank}%
            </span>
          </div>

          {([
            ['multiple_choice', 'Multiple Choice'],
            ['true_false', 'True / False'],
            ['fill_blank', 'Fill in the Blank'],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{label}</span>
                <span className="font-semibold">{questionTypeMix[key]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={questionTypeMix[key]}
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  setQuestionTypeMix((prev) => ({
                    ...prev,
                    [key]: nextValue,
                  }));
                }}
                disabled={isGenerating}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-4 rounded-2xl font-bold text-white text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Quiz
        </button>
      </form>
    </div>
  );
}
