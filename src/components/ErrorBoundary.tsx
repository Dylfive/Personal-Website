import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/Personal-Website/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl bg-surface border border-white/10 shadow-2xl text-center backdrop-blur-xl">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-serif font-bold text-white mb-2">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>

            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              {this.props.fallbackMessage ||
                'An unexpected error occurred while rendering this section. You can try refreshing or returning to safety.'}
            </p>

            {this.state.error && import.meta.env.DEV && (
              <pre className="mb-6 p-3 rounded-lg bg-black/40 border border-white/5 text-xs text-red-300/80 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try again
              </button>

              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
              >
                Reload page
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
