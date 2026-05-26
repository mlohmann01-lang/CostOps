import { useLocation } from 'wouter'
import { useRuntimeContext } from '../lib/runtimeContext'

export default function WorkspaceSelection() {
  const [, navigate] = useLocation()
  const runtime = useRuntimeContext()
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--surface-1)' }}>
    <div style={{ width: 980, maxWidth: '94vw' }}>
      <h1>Choose your workspace</h1>
      <p>Select whether you want to explore Certen safely with synthetic data or connect to a live governed tenant.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}><h2>Demo Workspace</h2><p>Explore Certen using deterministic synthetic evidence, simulated execution, governed approvals, and drift scenarios. No production systems are connected.</p><p>Synthetic evidence · No production connectors · Live execution disabled · Safe simulation</p><button onClick={() => { runtime.selectEnvironment('DEMO'); navigate('/all/command') }}>Enter Demo Workspace</button></div>
        <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}><h2>Live Workspace</h2><p>Use Certen with real tenant data, live connectors, governance controls, approvals, dry-runs, outcome ledgering, and drift monitoring.</p><p>Real tenant data · Live connectors · Approval gated · Read-only beta by default</p><button onClick={() => { runtime.selectEnvironment('LIVE'); navigate('/all/command') }}>Enter Live Workspace</button></div>
      </div>
    </div>
  </div>
}
