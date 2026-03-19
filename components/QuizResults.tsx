'use client';

/**
 * components/QuizResults.tsx
 * Final results page — score, percentage, time taken,
 * and a colour-coded review of every question.
 */

import { useQuizStore } from '@/store';
import { formatDuration, formatPercentage, getScoreColour } from '@/lib/utils';
import { useState, type CSSProperties } from 'react';
import { HINT_PENALTY_POINTS } from '@/lib/constants';

// ─── Score ring ───────────────────────────────────────────────

interface ScoreRingProps {
  percentage: number;
}

function CelebrationPoppers() {
  const poppers = Array.from({ length: 22 }, (_, i) => {
    const spread = (i - 10.5) * 13;
    const lift = -96 - (i % 5) * 16;
    const rotate = (i % 2 === 0 ? 1 : -1) * (120 + (i % 4) * 35);
    const delay = (i % 8) * 55;
    const colorPalette = ['#38bdf8', '#0ea5e9', '#2563eb', '#60a5fa', '#06b6d4'];
    const color = colorPalette[i % colorPalette.length];

    return {
      id: i,
      style: {
        '--popper-x': `${spread}px`,
        '--popper-y': `${lift}px`,
        '--popper-rotate': `${rotate}deg`,
        '--popper-delay': `${delay}ms`,
        '--popper-color': color,
      } as CSSProperties,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {poppers.map((piece) => (
        <span key={piece.id} className="quiz-popper" style={piece.style} />
      ))}
      {Array.from({ length: 30 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const spread = side * (30 + (i % 8) * 18);
        const lift = -190 - (i % 6) * 22;
        const rotate = side * (140 + (i % 5) * 32);
        const delay = 140 + (i % 10) * 48;
        const left = 8 + ((i * 17) % 84);
        const size = 0.36 + (i % 4) * 0.08;
        const palette = ['#22d3ee', '#38bdf8', '#60a5fa', '#2563eb', '#14b8a6'];
        const color = palette[i % palette.length];

        return (
          <span
            key={`bottom-${i}`}
            className="quiz-popper-bottom"
            style={{
              '--popper-left': `${left}%`,
              '--popper-size': `${size}rem`,
              '--popper-x': `${spread}px`,
              '--popper-y': `${lift}px`,
              '--popper-rotate': `${rotate}deg`,
              '--popper-delay': `${delay}ms`,
              '--popper-color': color,
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

function ScoreRing({ percentage }: ScoreRingProps) {
  const colour = getScoreColour(percentage);
  const circumference = 2 * Math.PI * 54; // r = 54
  const offset = circumference - (percentage / 100) * circumference;

  const strokeColor = {
    green:  '#22c55e',
    yellow: '#f59e0b',
    red:    '#ef4444',
  }[colour];

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke={strokeColor} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

// ─── Question review card ─────────────────────────────────────

import { type Question } from '@/types/quiz';

interface ReviewCardProps {
  question: Question;
  index: number;
}

function ReviewCard({ question, index }: ReviewCardProps) {
  const isCorrect = question.isCorrect;

  return (
    <div
      className={`rounded-2xl border-2 p-5 space-y-3 transition-all ${
        isCorrect
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
      }`}
    >
      {/* Question header */}
      <div className="flex items-start gap-3">
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
            isCorrect
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {isCorrect ? 'OK' : 'NO'}
        </span>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
          Q{index + 1}. {question.text}
        </p>
      </div>

      {/* Answer pills */}
      <div className="space-y-1.5 pl-0 sm:pl-9">
        {question.userSelectedAnswer && !isCorrect && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-medium text-red-500 sm:w-24 sm:shrink-0">Your answer:</span>
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full">
              {question.userSelectedAnswer}
            </span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-medium text-green-600 dark:text-green-400 sm:w-24 sm:shrink-0">
            {isCorrect ? 'Your answer:' : 'Correct:'}
          </span>
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
            {question.correctAnswer}
          </span>
        </div>
        {!question.userSelectedAnswer && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-medium text-red-500 sm:w-24 sm:shrink-0">Not answered</span>
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full">
              No response
            </span>
          </div>
        )}
        {question.hintUsed && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-500 w-24 shrink-0">Hint used</span>
          </div>
        )}
        {question.explanation && (
          <p className="text-xs mt-2 rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {question.explanation}
          </p>
        )}
      </div>
    </div>
  );
}

interface FollowUpAssistantProps {
  topic: string;
}

function FollowUpAssistant({ topic }: FollowUpAssistantProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const askFollowUp = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('Thinking...');
    try {
      const response = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, question: question.trim() }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      setAnswer(data.answer ?? data.error ?? 'No response.');
    } catch {
      setAnswer('Unable to fetch follow-up answer right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 space-y-4">
      <h4 className="text-base font-bold text-slate-900 dark:text-white">Ask a follow-up question</h4>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={`Ask anything about ${topic}...`}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5"
        />
        <button
          type="button"
          onClick={askFollowUp}
          disabled={loading || !question.trim()}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 disabled:opacity-50"
        >
          Ask
        </button>
      </div>
      {answer && (
        <p className="text-sm rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 whitespace-pre-line">
          {answer}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function QuizResults() {
  const { questions, score, startedAt, finishedAt, config, resetQuiz, timeLimitReached } = useQuizStore();

  if (score === null || !config) return null;

  const total = questions.length;
  const hintPenalty = questions.filter((q) => q.hintUsed).length * HINT_PENALTY_POINTS;
  const rawScore = Math.min(total, score + hintPenalty);
  const finalScore = score;
  const percentage = (score / total) * 100;
  const colour = getScoreColour(percentage);
  const formatScore = (value: number) => (Number.isInteger(value) ? value.toString() : value.toFixed(1));

  const timeTakenSeconds =
    startedAt && finishedAt
      ? Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000)
      : null;

  const gradeLabel = {
    green:  percentage >= 90 ? 'Excellent result' : 'Great work',
    yellow: 'Good progress',
    red:    'Keep practicing',
  }[colour];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 space-y-8">
      {/* Header card */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 text-center space-y-5">
        <CelebrationPoppers />
        <ScoreRing percentage={percentage} />

        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{gradeLabel}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm capitalize">
            {config.topic} · {config.difficulty}
          </p>
          {timeLimitReached && (
            <p className="mt-2 inline-flex items-center rounded-full border border-amber-200 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Time limit reached. Score is based on answers submitted before timeout.
            </p>
          )}
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {formatScore(finalScore)}/{total}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Final score</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {formatScore(rawScore)}/{total}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Base before penalty</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {formatPercentage(percentage)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Percentage (after penalty)</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-5 py-3 text-center">
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              -{hintPenalty.toFixed(1)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hint penalty</p>
          </div>
          {timeTakenSeconds !== null && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-5 py-3 text-center">
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                {formatDuration(timeTakenSeconds)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Time taken</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={resetQuiz}
          className="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/40"
        >
          Start new quiz
        </button>
      </div>

      {/* Question review */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Question Review
        </h3>
        {questions.map((q, i) => (
          <ReviewCard key={q.id} question={q} index={i} />
        ))}
      </div>

      <FollowUpAssistant topic={config.topic} />
    </div>
  );
}
