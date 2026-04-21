import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production, send to error tracking (e.g. Sentry)
    if (process.env.NODE_ENV === 'production') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          padding: 20,
          flexDirection: 'column',
          gap: 20,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 64 }}>⚠️</div>
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, marginBottom: 12 }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 500, lineHeight: 1.6 }}>
              An unexpected error occurred. Please try refreshing the page. If the problem persists,
              contact support.
            </p>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              maxWidth: 700,
              textAlign: 'left',
              fontSize: 12,
              fontFamily: 'monospace',
              color: '#e74c3c'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Error Details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              🔄 Refresh Page
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
