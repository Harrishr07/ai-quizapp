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
  userName?: string | null;
  userImage?: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

function NavBar({
  activeTab,
  onTabChange,
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

        {/* Footer */}
        <footer className="text-center px-4 py-8 text-xs text-slate-400 dark:text-slate-600">
          AI Quiz · Powered by Next.js 14 + Zustand
        </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}
