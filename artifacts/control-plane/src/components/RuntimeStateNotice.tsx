import type { ControlPlaneDataSource } from '../lib/controlPlaneTypes'
import type { RuntimeEnvironment } from '../lib/runtimeContext'

export function RuntimeStateNotice({ dataSource, environment, error, emptyMessage, demoMessage, liveMessage }: { dataSource: ControlPlaneDataSource; environment: RuntimeEnvironment; error?: string; emptyMessage: string; demoMessage?: string; liveMessage?: string }) {
  const text = dataSource === 'LIVE_ERROR' ? (error ?? 'Live API unavailable. Validate connectors and tenant configuration.') : dataSource === 'LIVE_EMPTY' ? (liveMessage ?? emptyMessage) : dataSource === 'DEMO_SEED' ? (demoMessage ?? 'Synthetic sandbox data.') : ''
  if (!text) return null
  return <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 8, padding: 10, fontSize: 12 }}>{environment === 'DEMO' ? 'DEMO' : 'LIVE'} · {text}</div>
}
