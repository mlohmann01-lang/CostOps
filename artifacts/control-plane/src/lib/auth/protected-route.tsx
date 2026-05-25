import { Redirect } from 'wouter'
import { useAuth } from './auth-provider'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  if (!session) return <Redirect to='/login?reason=unauthorized' />
  return <>{children}</>
}
