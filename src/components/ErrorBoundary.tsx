import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * App-level error boundary. Catches render/runtime errors anywhere in the tree
 * and shows a recoverable fallback instead of a blank white screen, so a single
 * component failure never takes down the whole portal. Errors are logged for
 * diagnostics; no sensitive data is surfaced to the user.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--bg-dark, #030712)',
          color: 'var(--text-primary, #e5e7eb)',
        }}
      >
        <span style={{ fontSize: '2.5rem' }} aria-hidden="true">
          ⚠️
        </span>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: 'var(--text-secondary, #9ca3af)', maxWidth: '32rem' }}>
          An unexpected error occurred. Your data is safe — please reload to continue.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.5rem' }}
        >
          Reload
        </button>
      </div>
    );
  }
}
