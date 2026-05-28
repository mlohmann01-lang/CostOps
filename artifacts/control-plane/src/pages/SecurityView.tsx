import { Shell } from '../components/layout/Shell'
import { EmptyState, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { useSecurityData } from '../hooks/useSecurityData'

export default function SecurityView() {
  const { data, isEmptyLive } = useSecurityData()
  if (isEmptyLive) return <Shell><EmptyState title='No security posture yet' description='Security details will appear once live tenant identity data is available.' /></Shell>

  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <div><SectionLabel>Platform administration</SectionLabel><h1>Security</h1><p style={{ color: 'var(--text-secondary)' }}>RBAC, active sessions, and tenant security configuration.</p></div>
    <section style={{ border: 'var(--border-default)', borderRadius: 10, overflow: 'hidden' }} data-testid='rbac-matrix'><div style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(4, .8fr)', padding: 10, color: 'var(--text-label)', fontSize: 11, textTransform: 'uppercase' }}><span>Role</span><span>Review</span><span>Approve</span><span>Execute</span><span>Configure</span></div>{data.roles.map((role) => <div key={role.role} style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(4, .8fr)', padding: 10, borderTop: 'var(--border-subtle)' }}><strong>{role.role}</strong><span>{role.review ? 'Allowed' : 'Denied'}</span><span>{role.approve ? 'Allowed' : 'Denied'}</span><span>{role.execute ? 'Allowed' : 'Denied'}</span><span>{role.configure ? 'Allowed' : 'Denied'}</span></div>)}</section>
    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Active users / sessions</SectionLabel>{data.sessions.map((session) => <div key={session.id} style={{ padding: '8px 0', borderTop: 'var(--border-subtle)' }}><strong>{session.user}</strong> <StatusPill status='active' /><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{session.role} · {session.lastSeen}</div></div>)}</div><div style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Tenant configuration</SectionLabel>{Object.entries(data.tenant).map(([key, value]) => <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: 'var(--border-subtle)' }}><span>{key}</span><strong>{value}</strong></div>)}</div></section>
  </div></Shell>
}
