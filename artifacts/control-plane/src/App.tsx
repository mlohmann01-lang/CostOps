import { useState } from 'react'
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import ConnectorHub from './pages/ConnectorHub'
import CommandView from './pages/CommandView'
import GovernanceView from './pages/GovernanceView'
import ExecutionView from './pages/ExecutionView'
import IntelligenceView from './pages/IntelligenceView'
import WorkspaceSelection from './pages/WorkspaceSelection'
import DriftMonitorView from './pages/DriftMonitorView'
import OutcomeLedgerView from './pages/OutcomeLedgerView'
import { RuntimeContextProvider, useRuntimeContext } from './lib/runtimeContext'
import { getSession, saveSession, clearSession, createDemoSession } from './lib/auth/session'

const DEMO_EMAIL = 'demo@certen.io'
const DEMO_PASSWORD = 'DemoWorkspace2026!'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

// ─── Login page ────────────────────────────────────────────────────────────────

function LoginPage() {
  const [, setLoc] = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
        saveSession(createDemoSession(email.trim().toLowerCase()))
        setLoc('/workspace')
      } else {
        setError('Invalid email or password.')
      }
      setLoading(false)
    }, 350)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 11px',
    background: 'var(--surface-2)',
    border: '0.5px solid var(--border-medium)',
    borderRadius: 7,
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-1)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--surface-0)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '32px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--c-teal-400)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShieldCheck size={17} color="#fff" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-primary)' }}>Certen</span>
        </div>

        <h1 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Sign in to your workspace
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Use your Certen credentials to continue.
        </p>
        <div style={{
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-subtle)',
          borderRadius: 7,
          padding: '9px 12px',
          marginBottom: 18,
          fontSize: 11,
          color: 'var(--text-tertiary)',
          lineHeight: 1.7,
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Demo credentials</strong><br />
          Email: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>demo@certen.io</span><br />
          Password: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>DemoWorkspace2026!</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--c-red-400)', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 2,
              padding: '10px 0',
              background: loading ? 'var(--c-teal-200)' : 'var(--c-teal-400)',
              border: 'none',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 22, textAlign: 'center' }}>
          Demo workspace · synthetic data only
        </p>
      </div>
    </div>
  )
}

// ─── Named route components (stable references — no inline arrows) ─────────────

function LoginRoute() {
  const session = getSession()
  return session ? <Redirect to="/workspace" /> : <LoginPage />
}

function HomeRoute() {
  const session = getSession()
  return <Redirect to={session ? '/workspace' : '/login'} />
}

function RequireRuntime({ children }: { children: React.ReactNode }) {
  const session = getSession()
  const runtime = useRuntimeContext()
  if (!session) return <Redirect to="/login" />
  if (!runtime.hasSelectedEnvironment) return <Redirect to="/workspace" />
  return <>{children}</>
}

function WorkspaceRoute() {
  const session = getSession()
  if (!session) return <Redirect to="/login" />
  return <WorkspaceSelection />
}

function ConnectorsRoute() {
  return <RequireRuntime><ConnectorHub /></RequireRuntime>
}

function CommandRoute({ params }: { params?: { domain?: string } }) {
  return <RequireRuntime><CommandView params={params} /></RequireRuntime>
}

function GovernanceRoute() {
  return <RequireRuntime><GovernanceView /></RequireRuntime>
}

function ExecutionRoute() {
  return <RequireRuntime><ExecutionView /></RequireRuntime>
}

function IntelligenceRoute({ params }: { params?: { domain?: string } }) {
  return <RequireRuntime><IntelligenceView params={params} /></RequireRuntime>
}

function OutcomesRoute() {
  return <RequireRuntime><OutcomeLedgerView /></RequireRuntime>
}

function DriftRoute() {
  return <RequireRuntime><DriftMonitorView /></RequireRuntime>
}

function StubRoute() {
  const session = getSession()
  if (!session) return <Redirect to="/login" />
  return <Redirect to="/workspace" />
}

function CatchAllRoute() {
  const session = getSession()
  return <Redirect to={session ? '/workspace' : '/login'} />
}

// ─── Router ────────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginRoute} />
      <Route path="/" component={HomeRoute} />
      <Route path="/workspace" component={WorkspaceRoute} />
      <Route path="/connectors" component={ConnectorsRoute} />
      <Route path="/:domain/command" component={CommandRoute} />
      <Route path="/:domain/governance" component={GovernanceRoute} />
      <Route path="/:domain/execution" component={ExecutionRoute} />
      <Route path="/:domain/intelligence" component={IntelligenceRoute} />
      <Route path="/outcomes" component={OutcomesRoute} />
      <Route path="/drift" component={DriftRoute} />
      <Route path="/sync-jobs" component={StubRoute} />
      <Route path="/audit-log" component={StubRoute} />
      <Route path="/settings" component={StubRoute} />
      <Route component={CatchAllRoute} />
    </Switch>
  )
}

// ─── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RuntimeContextProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter></RuntimeContextProvider>
    </QueryClientProvider>
  )
}
