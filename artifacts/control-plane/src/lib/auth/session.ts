export type TenantMode =
  | 'DEMO'
  | 'PILOT_READ_ONLY'
  | 'PRODUCTION_RECOMMEND_ONLY'
  | 'PRODUCTION_APPROVAL_REQUIRED'
  | 'PRODUCTION_GOVERNED_EXECUTION'

export type Role = 'VIEWER' | 'OPERATOR' | 'ADMIN' | 'OWNER'

export type SessionState = {
  accessToken: string
  expiresAt: string
  tenantId: string
  tenantMode: TenantMode
  role: Role
  isDemo: boolean
  user: { email: string; name: string }
  environment: 'DEMO' | 'PRODUCTION' | 'PILOT'
}

const KEY = 'certen.session'

export function saveSession(session: SessionState) {
  sessionStorage.setItem(KEY, JSON.stringify(session))
}

export function getSession(): SessionState | null {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionState
  } catch {
    return null
  }
}

export function clearSession() {
  sessionStorage.removeItem(KEY)
}

export function createDemoSession(email: string): SessionState {
  return {
    accessToken: 'demo-token',
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    tenantId: 'certen-demo',
    tenantMode: 'DEMO',
    role: 'ADMIN',
    isDemo: true,
    user: { email, name: 'Admin' },
    environment: 'DEMO',
  }
}
