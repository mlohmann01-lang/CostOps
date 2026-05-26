import { useLocation } from 'wouter'
import { useRuntimeContext } from '../lib/runtimeContext'

export function RuntimeEnvironmentBanner() {
  const [, navigate] = useLocation()
  const runtime = useRuntimeContext()
  if (!runtime.hasSelectedEnvironment) return null
  return <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 8, padding: 10, marginBottom: 10, background: runtime.environment === 'DEMO' ? 'var(--surface-2)' : 'var(--surface-1)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div><strong>{runtime.banner.label}</strong> · tenant {runtime.tenantId}<div style={{ fontSize: 12 }}>{runtime.banner.description}</div></div>
      <button onClick={() => navigate('/workspace')}>Switch workspace</button>
    </div>
  </div>
}
