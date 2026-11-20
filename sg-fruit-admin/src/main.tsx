import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 600, margin: '60px auto', background: '#fff', borderRadius: 12, border: '1px solid #fee2e2' }}>
          <h2 style={{ color: '#dc2626', marginBottom: 12 }}>เกิดข้อผิดพลาดในการโหลดหน้า Admin Dashboard</h2>
          <pre style={{ background: '#fef2f2', padding: 16, borderRadius: 8, overflowX: 'auto', fontSize: 13, color: '#991b1b' }}>
            {this.state.error?.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '8px 16px', background: '#214d34', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            โหลดหน้าเว็บใหม่
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
