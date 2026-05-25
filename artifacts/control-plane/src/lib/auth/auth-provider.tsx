import { createContext, useContext, useMemo, useState } from 'react'
import { clearSession, createDemoSession, getSession, saveSession, type SessionState } from './session'

type AuthContextValue = {
  session: SessionState | null
  loading: boolean
  loginDemo: (email?: string) => Promise<void>
  logout: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(() => getSession())
  const [loading, setLoading] = useState(false)

  const value = useMemo(() => ({
    session,
    loading,
    loginDemo: async (email = 'demo@certen.io') => {
      setLoading(true)
      await new Promise(r => setTimeout(r, 450))
      const s = createDemoSession(email)
      saveSession(s)
      setSession(s)
      setLoading(false)
    },
    logout: () => { clearSession(); setSession(null) },
    refresh: () => setSession(getSession()),
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
