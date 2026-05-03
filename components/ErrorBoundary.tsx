"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
            <p className="text-lg font-semibold text-stone-900 mb-2">Something went wrong</p>
            <p className="text-sm text-stone-500 mb-4">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
