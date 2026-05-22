import { clearSession, getSession } from './session'

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const session = getSession()
  const headers = new Headers(init.headers)
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`)
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401) {
    clearSession()
    window.location.href = '/login'
  }
  if (res.status === 403) throw new Error('ACCESS_DENIED')
  return res
}
