import React, { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Top-Level Error Boundary to ensure user NEVER sees a blank screen
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL: React caught render error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleClearAndReload = () => {
    try {
      const appStorageKeys = [];
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key?.startsWith('ppd_')) appStorageKeys.push(key);
      }
      appStorageKeys.forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '650px',
            width: '100%',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '20px'
              }}>!</div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Application Diagnostic Screen</h1>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>An unexpected UI error was caught</p>
              </div>
            </div>

            <div style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              overflowX: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#f87171'
            }}>
              <strong>{this.state.error?.name}: </strong>
              {this.state.error?.message}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={this.handleClearAndReload}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reset This Demo & Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 18px',
                  background: '#334155',
                  color: '#e2e8f0',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Window global error logger
window.addEventListener('error', (event) => {
  console.error('GLOBAL WINDOW ERROR:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>
);
