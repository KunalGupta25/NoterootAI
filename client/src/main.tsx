import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '40px', fontFamily: 'monospace', background: '#1a0000',
          color: '#ff6b6b', minHeight: '100vh', whiteSpace: 'pre-wrap'
        }}>
          <h2 style={{ color: '#ff4444', marginBottom: '16px' }}>⚠ App Crashed</h2>
          <strong>{this.state.error.message}</strong>
          <pre style={{ marginTop: '16px', fontSize: '12px', opacity: 0.8 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
