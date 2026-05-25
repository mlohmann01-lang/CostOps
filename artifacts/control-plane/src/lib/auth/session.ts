export type TenantMode = 'DEMO' | 'READ_ONLY' | 'GOVERNED_EXECUTION' | 'PRODUCTION'
export type Role = 'Viewer' | 'Operator' | 'Approver' | 'Admin' | 'Auditor'
export type AuthMode = 'DEMO' | 'AUTHENTICATED' | 'UNAUTHORIZED'

export type SessionState = {
  accessToken: string
  expiresAt: string
  tenantId: string
  tenantName: string
  tenantMode: TenantMode
  role: Role
  authMode: AuthMode
  isDemo: boolean
  liveExecutionEnabled: boolean
  connectorMode: 'SYNTHETIC' | 'LIVE' | 'HYBRID'
  user: { email: string; name: string }
  environment: 'DEMO' | 'PRODUCTION'
}

const KEY = 'certen.session.v2'
const DEMO_EMAIL = 'demo@certen.io'
const DEMO_PASSWORD = 'DemoWorkspace2026!'

export function saveSession(session: SessionState) { localStorage.setItem(KEY, JSON.stringify(session)) }

export function getSession(): SessionState | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SessionState
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null
    return parsed
  } catch { return null }
}

export function getSessionStatus(): 'active' | 'expired' | 'none' {
  const raw = localStorage.getItem(KEY)
  if (!raw) return 'none'
  try { const parsed = JSON.parse(raw) as SessionState; return new Date(parsed.expiresAt).getTime() <= Date.now() ? 'expired' : 'active' } catch { return 'none' }
}

export function clearSession() { localStorage.removeItem(KEY) }

export function validateCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD
}

export function createDemoSession(email: string): SessionState {
  return {
    accessToken: 'demo-token', expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    tenantId: 'certen-demo', tenantName: 'Certen Demo', tenantMode: 'DEMO', role: 'Operator', authMode: 'DEMO',
    isDemo: true, liveExecutionEnabled: false, connectorMode: 'SYNTHETIC',
    user: { email, name: 'Demo Operator' }, environment: 'DEMO',
  }
}
