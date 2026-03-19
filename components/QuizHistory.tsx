'use client';

/**
 * components/QuizHistory.tsx
 * Dashboard showing all past quiz attempts with
 * filtering by difficulty and sorting by date/score/time.
 */

import { useState, useMemo } from 'react';
import { useQuizStore } from '@/store';
import { useSession } from 'next-auth/react';
import {
  type QuizAttempt,
  type HistoryFilters,
  type HistorySortConfig,
  type HistorySortField,
  type Difficulty,
} from '@/types/quiz';
import { formatDuration, formatPercentage, formatDate, getScoreColour } from '@/lib/utils';

// ─── Attempt card ─────────────────────────────────────────────

interface AttemptCardProps {
  attempt: QuizAttempt;
  onDelete: (id: string) => void;
  onOpen: (attempt: QuizAttempt) => void;
}

function AttemptCard({ attempt, onDelete, onOpen }: AttemptCardProps) {
  const colour = getScoreColour(attempt.percentage);
  const barColour = { green: 'bg-green-500', yellow: 'bg-amber-500', red: 'bg-red-500' }[colour];
  const textColour = { green: 'text-green-600 dark:text-green-400', yellow: 'text-amber-600 dark:text-amber-400', red: 'text-red-600 dark:text-red-400' }[colour];
  const handleOpen = () => onOpen(attempt);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4 hover:shadow-md transition-shadow"
    >
      {/* Topic row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white truncate capitalize">
            {attempt.config.topic}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {formatDate(attempt.completedAt)} · {attempt.totalQuestions} questions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="capitalize text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
            {attempt.config.difficulty}
          </span>
          <button
            type="button"
            aria-label="Delete attempt"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(attempt.id);
            }}
            className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Score bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">Score</span>
          <span className={`text-sm font-bold ${textColour}`}>
            {attempt.score}/{attempt.totalQuestions} · {formatPercentage(attempt.percentage)}
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColour} rounded-full transition-all duration-700`}
            style={{ width: `${attempt.percentage}%` }}
          />
        </div>
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span>Time {formatDuration(attempt.timeTakenSeconds)}</span>
        <span>{attempt.score.toFixed(1)} final score</span>
        <span>Penalty -{attempt.hintPenalty.toFixed(1)}</span>
      </div>
    </div>
  );
}

interface AttemptReviewModalProps {
  attempt: QuizAttempt;
  onClose: () => void;
}

function AttemptReviewModal({ attempt, onClose }: AttemptReviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto max-w-3xl h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {attempt.config.topic}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDate(attempt.completedAt)} · {attempt.score}/{attempt.totalQuestions} · {formatPercentage(attempt.percentage)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close review"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {attempt.questions.map((q, idx) => {
            const wasCorrect = Boolean(q.isCorrect);
            return (
              <div
                key={`${attempt.id}-${q.id}`}
                className={`rounded-2xl border p-4 space-y-3 ${
                  wasCorrect
                    ? 'border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-900/10'
                    : 'border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/10'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  Q{idx + 1}. {q.text}
                </p>

                <div className="grid gap-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                    <span className="sm:w-24 sm:shrink-0 font-semibold text-slate-500 dark:text-slate-400">Your answer</span>
                    <span className={`px-2.5 py-1 rounded-full ${q.userSelectedAnswer ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400'}`}>
                      {q.userSelectedAnswer ?? 'Skipped'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                    <span className="sm:w-24 sm:shrink-0 font-semibold text-green-600 dark:text-green-400">Correct</span>
                    <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {q.correctAnswer}
                    </span>
                  </div>
                </div>
                {q.explanation && (
                  <p className="text-xs rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sort button helper ───────────────────────────────────────

interface SortButtonProps {
  label: string;
  field: HistorySortField;
  current: HistorySortConfig;
  onChange: (field: HistorySortField) => void;
}

function SortButton({ label, field, current, onChange }: SortButtonProps) {
  const active = current.field === field;
  return (
    <button
      type="button"
      onClick={() => onChange(field)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
        active
          ? 'bg-blue-600 text-white border-blue-600 shadow'
          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
      }`}
    >
      {label} {active ? (current.direction === 'asc' ? '↑' : '↓') : ''}
    </button>
  );
}

interface SparklineProps {
  values: number[];
}

function Sparkline({ values }: SparklineProps) {
  if (values.length < 2) {
    return <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const safeRange = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / safeRange) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="h-14 w-full">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-blue-500"
        points={points}
      />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function QuizHistory() {
  const { history, deleteAttempt, clearHistory } = useQuizStore();
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? null;

  const userHistory = useMemo(
    () => history.filter((attempt) => attempt.userEmail === userEmail),
    [history, userEmail]
  );

  const [filters, setFilters] = useState<HistoryFilters>({
    difficulty: 'all',
    minPercentage: 0,
    maxPercentage: 100,
  });

  const [sort, setSort] = useState<HistorySortConfig>({
    field: 'completedAt',
    direction: 'desc',
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('AI Quiz Performance Report', 14, 18);
    doc.setFontSize(11);
    doc.text(`Attempts: ${userHistory.length}`, 14, 30);
    doc.text(`Average score: ${formatPercentage(avgScore)}`, 14, 37);
    doc.text(`Best score: ${formatPercentage(best)}`, 14, 44);

    let y = 56;
    filtered.slice(0, 20).forEach((attempt, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${idx + 1}. ${attempt.config.topic} | ${attempt.score}/${attempt.totalQuestions} | ${formatPercentage(attempt.percentage)} | ${formatDate(attempt.completedAt)}`,
        14,
        y
      );
      y += 7;
    });

    doc.save('quiz-performance-report.pdf');
  };

  const handleSortField = (field: HistorySortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filtered = useMemo<QuizAttempt[]>(() => {
    let result = [...userHistory];

    if (filters.difficulty !== 'all') {
      result = result.filter((a) => a.config.difficulty === filters.difficulty);
    }
    result = result.filter(
      (a) => a.percentage >= filters.minPercentage && a.percentage <= filters.maxPercentage
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sort.field === 'completedAt') {
        cmp = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      } else if (sort.field === 'percentage') {
        cmp = a.percentage - b.percentage;
      } else {
        cmp = a.timeTakenSeconds - b.timeTakenSeconds;
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [userHistory, filters, sort]);

  // ── Summary stats ───────────────────────────────────────────
  const avgScore =
    userHistory.length > 0
      ? userHistory.reduce((acc, a) => acc + a.percentage, 0) / userHistory.length
      : 0;
  const best = userHistory.length > 0 ? Math.max(...userHistory.map((a) => a.percentage)) : 0;
  const trendValues = [...userHistory]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .map((attempt) => attempt.percentage);

  const topicBreakdown = Object.entries(
    userHistory.reduce<Record<string, { total: number; count: number }>>((acc, attempt) => {
      const topic = attempt.config.topic.toLowerCase();
      acc[topic] = acc[topic] ?? { total: 0, count: 0 };
      acc[topic].total += attempt.percentage;
      acc[topic].count += 1;
      return acc;
    }, {})
  )
    .map(([topic, stats]) => ({ topic, avg: stats.total / stats.count, count: stats.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const streakDays = (() => {
    const days = new Set(userHistory.map((a) => new Date(a.completedAt).toISOString().slice(0, 10)));
    let streak = 0;
    const current = new Date();
    while (true) {
      const key = current.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      current.setDate(current.getDate() - 1);
    }
    return streak;
  })();

  const achievements: string[] = [];
  if (best >= 90) achievements.push('High Scorer');
  if (userHistory.length >= 10) achievements.push('Quiz Explorer');
  if (streakDays >= 3) achievements.push('On a Streak');

  if (userHistory.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="mx-auto h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-sm font-semibold">
          Log
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">No quiz history yet.</p>
        <p className="text-sm text-slate-400 dark:text-slate-500">Complete a quiz to see your results here.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz History</h2>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Confirm clear dialog */}
      {showConfirm && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            Delete all {userHistory.length} attempts?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { clearHistory(); setShowConfirm(false); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold"
            >
              Delete all
            </button>
          </div>
        </div>
      )}

      {selectedAttempt && (
        <AttemptReviewModal
          attempt={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
        />
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Attempts', value: userHistory.length.toString() },
          { label: 'Avg Score', value: formatPercentage(avgScore) },
          { label: 'Best Score', value: formatPercentage(best) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center">
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Performance Trend</h3>
          <button
            type="button"
            onClick={exportPdf}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold"
          >
            Export PDF
          </button>
        </div>
        <Sparkline values={trendValues} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Category Analysis</h3>
          {topicBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No topic data yet.</p>
          ) : (
            topicBreakdown.map((item) => (
              <div key={item.topic} className="flex items-center justify-between text-xs">
                <span className="capitalize text-slate-600 dark:text-slate-300">{item.topic}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {formatPercentage(item.avg)} ({item.count})
                </span>
              </div>
            ))
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Streak & Achievements</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">Current streak: <span className="font-semibold">{streakDays} day(s)</span></p>
          <div className="flex flex-wrap gap-2">
            {achievements.length === 0 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">No achievements yet.</span>
            ) : (
              achievements.map((badge) => (
                <span key={badge} className="text-xs rounded-full px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {badge}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-4">
        {/* Difficulty filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Difficulty:</span>
          {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, difficulty: d as Difficulty | 'all' }))}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all border ${
                filters.difficulty === d
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Min score filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 sm:w-24 sm:shrink-0">
            Min score: {filters.minPercentage}%
          </span>
          <input
            type="range" min={0} max={100} step={5}
            value={filters.minPercentage}
            onChange={(e) => setFilters((f) => ({ ...f, minPercentage: Number(e.target.value) }))}
            className="flex-1 accent-blue-600"
          />
        </div>

        {/* Sort */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Sort by:</span>
          <SortButton label="Date" field="completedAt" current={sort} onChange={handleSortField} />
          <SortButton label="Score" field="percentage" current={sort} onChange={handleSortField} />
          <SortButton label="Time" field="timeTakenSeconds" current={sort} onChange={handleSortField} />
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Showing {filtered.length} of {userHistory.length} attempts
      </p>

      {/* Attempt cards */}
      {filtered.length === 0 ? (
        <p className="text-center text-slate-400 dark:text-slate-500 py-8">No attempts match your filters.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((attempt) => (
            <AttemptCard
              key={attempt.id}
              attempt={attempt}
              onDelete={deleteAttempt}
              onOpen={setSelectedAttempt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
