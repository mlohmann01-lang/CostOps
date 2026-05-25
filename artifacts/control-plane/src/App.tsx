import { useState } from 'react'
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import ConnectorHub from './pages/ConnectorHub'
import CommandView from './pages/CommandView'
import GovernanceView from './pages/GovernanceView'
import ExecutionView from './pages/ExecutionView'
import IntelligenceView from './pages/IntelligenceView'
import SyncJobsPage from './pages/SyncJobsPage'
import AuditLogPage from './pages/AuditLogPage'
import SettingsPage from './pages/SettingsPage'
import { getSession, saveSession, clearSession, createDemoSession } from './lib/auth/session'

const DEMO_EMAIL = 'admin@certen.com'
const DEMO_PASSWORD = 'certen@demo1'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

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
        setLoc('/connectors')
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
        {/* Logo */}
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
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 22px' }}>
          Use your Certen credentials to continue.
        </p>

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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = getSession()
  if (!session) return <Redirect to="/login" />
  return <>{children}</>
}

function Router() {
  const session = getSession()

  return (
    <Switch>
      <Route path="/login" component={() =>
        session ? <Redirect to="/connectors" /> : <LoginPage />
      } />

      <Route path="/" component={() =>
        <Redirect to={session ? '/connectors' : '/login'} />
      } />

      <Route path="/connectors" component={() =>
        <RequireAuth><ConnectorHub /></RequireAuth>
      } />

      <Route path="/:domain/command" component={({ params }) =>
        <RequireAuth><CommandView params={params} /></RequireAuth>
      } />

      <Route path="/:domain/governance" component={({ params }) =>
        <RequireAuth><GovernanceView params={params} /></RequireAuth>
      } />

      <Route path="/:domain/execution" component={({ params }) =>
        <RequireAuth><ExecutionView params={params} /></RequireAuth>
      } />

      <Route path="/:domain/intelligence" component={({ params }) =>
        <RequireAuth><IntelligenceView params={params} /></RequireAuth>
      } />

      <Route path="/sync-jobs" component={() =>
        <RequireAuth><SyncJobsPage /></RequireAuth>
      } />
      <Route path="/audit-log" component={() =>
        <RequireAuth><AuditLogPage /></RequireAuth>
      } />
      <Route path="/settings" component={() =>
        <RequireAuth><SettingsPage /></RequireAuth>
      } />

      <Route component={() => <Redirect to={session ? '/connectors' : '/login'} />} />
    </Switch>
  )
}

export default function App() {
  const [, forceUpdate] = useState(0)

  function handleLogout() {
    clearSession()
    forceUpdate(n => n + 1)
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
        <LogoutBridge onLogout={handleLogout} />
      </WouterRouter>
    </QueryClientProvider>
  )
}

function LogoutBridge({ onLogout }: { onLogout: () => void }) {
  if (typeof window !== 'undefined') {
    (window as any).__certenLogout = onLogout
  }
  return null
}
