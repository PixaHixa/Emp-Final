import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function renderFatal(message: string) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a;padding:1rem;font-family:system-ui,sans-serif;">
      <div style="max-width:56rem;width:100%;text-align:left;direction:ltr;">
        <h1 style="margin:0 0 .75rem;font-size:1.125rem;">Runtime error</h1>
        <pre style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;border:1px solid #e2e8f0;border-radius:.75rem;padding:.75rem;">${message}</pre>
      </div>
    </div>
  `
}

window.addEventListener('error', (event) => {
  const msg = event.error instanceof Error ? `${event.error.name}: ${event.error.message}` : String(event.message)
  renderFatal(msg)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const msg = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason)
  renderFatal(`Unhandled promise rejection: ${msg}`)
})

type ErrorBoundaryState = { hasError: boolean; message: string }

class RootErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    return { hasError: true, message: msg }
  }

  override componentDidCatch(error: unknown) {
    console.error('RootErrorBoundary', error)
  }

  override render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f8fafc',
          color: '#0f172a',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: '56rem', width: '100%', textAlign: 'left', direction: 'ltr' }}>
          <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem' }}>Runtime error</h1>
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '0.75rem',
            }}
          >
            {this.state.message}
          </pre>
        </div>
      </div>
    )
  }
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  )
} catch (error) {
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  renderFatal(msg)
}
