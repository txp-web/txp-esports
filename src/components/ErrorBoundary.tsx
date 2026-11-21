import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let message = error.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed.error === 'string') {
        message = `Database operation blocked (${parsed.operationType}): ${parsed.error}`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center px-6">
          <div className="max-w-lg w-full bg-[#121318] border border-white/10 rounded-xl p-8 space-y-5">
            <p className="text-xs font-mono uppercase tracking-wider text-orange-400">
              Runtime Protection
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
              Something interrupted your session
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
