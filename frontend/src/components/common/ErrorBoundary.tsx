import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RetailSphere AI - Uncaught React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#F5EFE6] text-[#1C1814] font-sans">
          <div className="max-w-xl w-full bg-white/95 backdrop-blur-xl border-2 border-[#E2D7CB] rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#1C1814] tracking-tight">
                RetailSphere AI Recovery
              </h2>
              <p className="text-sm text-[#7A6C5E] font-medium leading-relaxed">
                We encountered an issue loading this view. You can reload the application or reset your session cache to continue.
              </p>
            </div>

            <div className="bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl p-4 text-left overflow-auto max-h-36">
              <p className="text-xs font-mono text-red-600 font-semibold break-words">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#38A132] hover:bg-[#32922D] text-white font-bold text-xs shadow-md transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              <button
                onClick={this.handleResetSession}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white border border-[#E2D7CB] hover:bg-[#FAF7F2] text-[#1C1814] font-bold text-xs shadow-sm transition-all duration-200"
              >
                <Trash2 className="w-4 h-4 text-amber-600" />
                Clear Cache & Restart
              </button>

              <a
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white border border-[#E2D7CB] hover:bg-[#FAF7F2] text-[#1C1814] font-bold text-xs shadow-sm transition-all duration-200"
              >
                <Home className="w-4 h-4 text-[#38A132]" />
                Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
