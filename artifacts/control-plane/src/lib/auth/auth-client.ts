import { clearSession, getSession, saveSession, type SessionState } from './session'

export async function demoLogin(): Promise<SessionState> {
  const r = await fetch('/api/auth/demo-login', { method: 'POST' })
  if (!r.ok) throw new Error('Demo login failed')
  const session = (await r.json()) as SessionState
  saveSession(session)
  return session
}

export async function getCurrentSession() {
  const local = getSession()
  if (local) return local
  const r = await fetch('/api/auth/me')
  if (!r.ok) return null
  return r.json()
}

export function loginRedirect() {
  window.location.href = '/api/auth/login/start'
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  clearSession()
}

export function getToken() {
  return getSession()?.accessToken
}
