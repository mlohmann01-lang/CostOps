import { Link, useLocation } from 'wouter'
import { RuntimeEnvironmentBanner } from './RuntimeEnvironmentBanner'

const NAV = [
  { label: 'Command', path: '/all/command' },
  { label: 'Governance', path: '/all/governance' },
  { label: 'Execution', path: '/all/execution' },
  { label: 'Connectors', path: '/connectors' },
  { label: 'Outcomes', path: '/outcomes' },
  { label: 'Drift', path: '/drift' },
]

export function ControlPlaneShell({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation()
  return <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }}>
    <div style={{ padding: '10px 18px', borderBottom: '0.5px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 10 }}>{NAV.map((n) => <Link key={n.path} href={n.path}><span style={{ fontSize: 12, fontWeight: loc === n.path ? 600 : 400 }}>{n.label}</span></Link>)}</div>
      <Link href='/workspace'><span style={{ fontSize: 12 }}>Switch workspace</span></Link>
    </div>
    <div style={{ padding: '12px 18px 0' }}><RuntimeEnvironmentBanner /></div>
    {children}
  </div>
}
