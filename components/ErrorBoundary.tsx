'use client';

/**
 * components/ErrorBoundary.tsx
 * React class component error boundary with a styled fallback UI.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface FallbackRenderProps {
  error: Error | null;
  reset: () => void;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: FallbackRenderProps) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset,
        });
      }

      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-red-100 dark:border-red-900 p-8 text-center space-y-5">
            <div className="mx-auto h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 flex items-center justify-center font-bold text-lg">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              An unexpected error occurred in the application. Your quiz history is safe.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-slate-50 dark:bg-slate-900 rounded-xl p-3 overflow-auto max-h-32 text-red-500 dark:text-red-400">
                {this.state.error.message}
              </pre>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 rounded-2xl font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
