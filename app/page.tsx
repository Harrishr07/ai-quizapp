'use client';

/**
 * app/page.tsx
 * Central hub — conditionally renders the correct view
 * based on the QuizStatus from the Zustand store.
 */

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/store';
import dynamic from 'next/dynamic';
import { signIn, signOut, useSession } from 'next-auth/react';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorAlert from '@/components/ErrorAlert';

interface ScreenLoaderProps {
  title: string;
  description: string;
}

function ScreenLoader({ title, description }: ScreenLoaderProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 shadow-lg p-6 sm:p-8 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

interface ScreenErrorFallbackProps {
  title: string;
  description: string;
  error?: Error | null;
  onRetry?: () => void;
}

function ScreenErrorFallback({ title, description, error, onRetry }: ScreenErrorFallbackProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="rounded-3xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 shadow-xl p-6 sm:p-8 text-center space-y-4">
        <div className="mx-auto h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 flex items-center justify-center font-bold text-lg">
          !
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        {error?.message && (
          <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-2xl px-4 py-3">
            {error.message}
          </p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all"
          >
            Try this section again
          </button>
        )}
      </div>
    </div>
  );
}

interface ScreenBoundaryProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ScreenBoundary({ title, description, children }: ScreenBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <ScreenErrorFallback
          title={title}
          description={description}
          error={error}
          onRetry={reset}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Lazy-load heavy components so the initial bundle stays light
const QuizGenerator = dynamic(() => import('@/components/QuizGenerator'), {
  ssr: false,
  loading: () => (
    <ScreenLoader
      title="Loading quiz builder"
      description="Preparing the quiz setup screen."
    />
  ),
});
const QuizTaker = dynamic(() => import('@/components/QuizTaker'), {
  ssr: false,
  loading: () => (
    <ScreenLoader
      title="Loading quiz session"
      description="Restoring your current questions and progress."
    />
  ),
});
const QuizResults = dynamic(() => import('@/components/QuizResults'), {
  ssr: false,
  loading: () => (
    <ScreenLoader
      title="Loading results"
      description="Preparing your score summary and review."
    />
  ),
});
const QuizHistory = dynamic(() => import('@/components/QuizHistory'), {
  ssr: false,
  loading: () => (
    <ScreenLoader
      title="Loading history"
      description="Fetching your past quiz attempts from local storage."
    />
  ),
});

// ─── Tab type ─────────────────────────────────────────────────

type Tab = 'quiz' | 'history';

// ─── Top navigation bar ───────────────────────────────────────

interface NavBarProps {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onOpenHelp: () => void;
  userName?: string | null;
  userImage?: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

function NavBar({
  activeTab,
  onTabChange,
  onOpenHelp,
  userName,
  userImage,
  onSignIn,
  onSignOut,
}: NavBarProps) {
  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2 sm:h-16 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-8 w-8 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
            AQ
          </span>
          <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
            AI<span className="text-blue-600">Quiz</span>
          </span>
        </div>

        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1 shrink-0">
            {(['quiz', 'history'] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'quiz' ? 'Quiz' : 'History'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenHelp}
            className="shrink-0 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open help"
          >
            Help
          </button>

          {userName && (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200/70 dark:border-slate-700 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={userName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center justify-center">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 max-w-28 truncate">
                {userName}
              </span>
            </div>
          )}

          {userName ? (
            <button
              type="button"
              onClick={onSignOut}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  canViewHistory: boolean;
}

function HelpModal({ isOpen, onClose, canViewHistory }: HelpModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quiz app help"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        aria-label="Close help"
      />

      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">How to use AI Quiz</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Quick guide for creating quizzes, taking tests, and tracking your scores.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300">
          <section className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">1. Start a quiz</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Open the Quiz tab and enter any topic (for example: Algebra, Biology, React).</li>
              <li>Set your question count and difficulty level.</li>
              <li>Adjust question type percentages. The sliders auto-balance and always keep the total at 100%.</li>
              <li>Select Generate Quiz to create your questions.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">2. Attend the quiz</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Read each question and choose or type your answer.</li>
              <li>Use navigation controls to move through questions.</li>
              <li>Submit when you are done to calculate your score and performance.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">3. View results</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>After submitting, the Results screen shows your score and percentage.</li>
              <li>Review correct vs incorrect answers to understand mistakes.</li>
              <li>Use the action buttons to start another quiz or move to history.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">4. Quiz history</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Open the History tab to see previous attempts and scores over time.</li>
              <li>History is linked to your signed-in Google account.</li>
              <li>
                {canViewHistory
                  ? 'You are signed in, so your history is available now.'
                  : 'You are currently in guest mode. Sign in with Google to save and view score history.'}
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">5. Account and navigation notes</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Guest mode lets you take quizzes immediately without signing in.</li>
              <li>If a quiz is in progress, switching tabs asks for confirmation so you do not lose work accidentally.</li>
              <li>Use the Help button anytime from the top bar.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

interface SignInPanelProps {
  onContinueAsGuest: () => void;
}

function SignInPanel({ onContinueAsGuest }: SignInPanelProps) {
  const handleGoogleSignIn = () => {
    void signIn('google', undefined, { prompt: 'select_account' });
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 shadow-xl p-8 sm:p-10 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xl font-bold flex items-center justify-center">
          G
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Start your AI quiz
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Continue as a guest right away, or sign in with Google to save quiz history.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Continue as guest
          </button>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function Home() {
  const { status, resetQuiz, setCurrentUserEmail, setHistory, fetchHistory } = useQuizStore();
  const { data: session, status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('quiz');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.email) {
      setCurrentUserEmail(session.user.email);
      void fetchHistory();
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      resetQuiz();
      setCurrentUserEmail(null);
      setHistory([]);
    }
  }, [
    sessionStatus,
    session?.user?.email,
    resetQuiz,
    setCurrentUserEmail,
    setHistory,
    fetchHistory,
  ]);

  const handleGoogleSignIn = () => {
    setIsGuestMode(false);
    void signIn('google', undefined, { prompt: 'select_account' });
  };

  const handleSignOut = () => {
    setIsGuestMode(false);
    resetQuiz();
    setActiveTab('quiz');
    void signOut({ redirect: false }).then(() => {
      window.location.href = '/';
    });
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab && status === 'idle') return;

    const isInActiveQuiz = status === 'taking' || status === 'generating';
    if (isInActiveQuiz) {
      const destinationLabel = tab === 'quiz' ? 'AI Quiz Generator' : 'History';
      const confirmed = window.confirm(
        `You have a quiz in progress. Go to ${destinationLabel}? This will end the current quiz.`
      );
      if (!confirmed) {
        return;
      }
      resetQuiz();
      setActiveTab(tab);
      return;
    }

    if (status === 'results') {
      resetQuiz();
    }

    setActiveTab(tab);
  };

  // Show quiz-related components regardless of active tab
  // (user is locked into quiz flow while taking)
  const renderContent = () => {
    if (status === 'generating' || status === 'taking') {
      return status === 'generating'
        ? (
          <ScreenBoundary
            title="Quiz builder unavailable"
            description="The generator screen crashed while preparing your quiz."
          >
            <QuizGenerator />
          </ScreenBoundary>
        )
        : (
          <ScreenBoundary
            title="Quiz session unavailable"
            description="The active quiz view failed to render. Your saved progress is still available."
          >
            <QuizTaker />
          </ScreenBoundary>
        );
    }

    if (status === 'results') {
      return (
        <ScreenBoundary
          title="Results unavailable"
          description="The results screen crashed while rendering your summary."
        >
          <QuizResults />
        </ScreenBoundary>
      );
    }

    // idle — show tabs
    if (activeTab === 'history') {
      if (sessionStatus !== 'authenticated') {
        return (
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 shadow-xl p-6 sm:p-8 text-center space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to view history</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Guest mode supports taking quizzes, but history is available only for signed-in users.
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all"
              >
                Sign in with Google
              </button>
            </div>
          </div>
        );
      }

      return (
        <ScreenBoundary
          title="History unavailable"
          description="The history dashboard could not be displayed right now."
        >
          <QuizHistory />
        </ScreenBoundary>
      );
    }

    return (
      <ScreenBoundary
        title="Quiz builder unavailable"
        description="The generator screen crashed before a quiz could be started."
      >
        <QuizGenerator />
      </ScreenBoundary>
    );
  };

  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <ScreenErrorFallback
          title="The app hit an unexpected error"
          description="A full-page failure occurred. You can retry the render or reload the app."
          error={error}
          onRetry={reset}
        />
      )}
    >
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-cyan-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -left-24 h-96 w-96 rounded-full bg-blue-300/35 blur-3xl dark:bg-blue-700/20" />
          <div className="absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-700/20" />
          <div className="absolute bottom-[-7rem] left-1/3 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-800/25" />
          <div className="absolute inset-0 opacity-30 dark:opacity-15 [background:linear-gradient(to_right,rgba(56,189,248,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
        </div>

        <div className="relative z-10">
        <NavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenHelp={() => setIsHelpOpen(true)}
          userName={session?.user?.name}
          userImage={session?.user?.image}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
        />

        <main className="py-6 sm:py-10 space-y-6">
          {sessionStatus === 'loading' && (
            <ScreenLoader
              title="Checking your session"
              description="Getting your account details before loading the app."
            />
          )}

          {sessionStatus === 'unauthenticated' && !isGuestMode && (
            <SignInPanel onContinueAsGuest={() => setIsGuestMode(true)} />
          )}

          {(sessionStatus === 'authenticated' || isGuestMode) && (
            <>
          {/* Inline error alert (network / API errors) */}
          <ErrorAlert />

          {/* If user is in results and wants to go to history */}
          {status === 'results' && (
            <div className="w-full max-w-2xl mx-auto px-4">
              <button
                type="button"
                onClick={() => {
                  resetQuiz();
                  setActiveTab('history');
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                View history
              </button>
            </div>
          )}

          {renderContent()}
            </>
          )}
        </main>

        {!isHelpOpen && (
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="Open help"
            className="fixed right-4 z-40 h-12 min-w-[3rem] rounded-full px-4 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 shadow-xl shadow-blue-300/40 dark:shadow-blue-900/40 hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all"
            style={{ bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
          >
            Help
          </button>
        )}

        {/* Footer */}
        <footer className="text-center px-4 py-8 text-xs text-slate-400 dark:text-slate-600">
          AI Quiz · Powered by Next.js 14 + Zustand
        </footer>

        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          canViewHistory={sessionStatus === 'authenticated'}
        />
        </div>
      </div>
    </ErrorBoundary>
  );
}
