import { Shell } from '../components/layout/Shell'
import { EmptyState, MetricCard, SectionLabel, StatusPill, LiveDataError } from '../components/shared/Foundation'
import { useRuntimeHealthData } from '../hooks/useRuntimeHealthData'
import { simulateConnectorRetry } from '../lib/demoRuntimeStore'
import { useWorkspace } from '../lib/workspaceContext'

type PillStatus = Parameters<typeof StatusPill>[0]['status']
const pill = (status: string): PillStatus => status === 'degraded' ? 'degraded' : status === 'testing' ? 'testing' : status === 'pending' ? 'pending' : status === 'blocked' ? 'blocked' : status === 'active' ? 'active' : 'ready'

export default function RuntimeHealthView() {
  const workspace = useWorkspace()
  const { data, isEmptyLive, error, refresh } = useRuntimeHealthData()
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  if (isEmptyLive) return <Shell><EmptyState title='No runtime health data yet' description='Runtime Health will populate after live runtime telemetry starts reporting.' /></Shell>

  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <div><SectionLabel>Platform administration</SectionLabel><h1>Runtime Health</h1><p style={{ color: 'var(--text-secondary)' }}>Governance runtime operational</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12 }}>
      <MetricCard label='Overall health score' value={`${data.overallScore}%`} delta={data.summary} hero />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }} data-testid='runtime-component-grid'>
        {data.components.map((component:any) => <div key={component.id} style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{component.name}</strong><StatusPill status={pill(component.status)} /></div>
          <div style={{ marginTop: 8 }}>{component.wording}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{component.detail}</p>
        </div>)}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Active issues</SectionLabel>{data.activeIssues.map((issue:any) => <div key={issue.id} style={{ padding: '10px 0', borderTop: 'var(--border-subtle)' }}><StatusPill status={pill(issue.severity)} /> <strong>{issue.title}</strong><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{issue.owner} · {issue.nextStep}</div>{issue.owner === 'Connector Ops' && <button onClick={() => workspace.mode === 'demo' && simulateConnectorRetry('m365')}>Retry connector</button>}</div>)}</section>
      <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Recent events</SectionLabel>{data.recentEvents.map((event:any) => <div key={event.id} style={{ padding: '10px 0', borderTop: 'var(--border-subtle)' }}><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{event.at}</span> <strong>{event.event}</strong><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{event.detail}</div></div>)}</section>
    </div>
  </div></Shell>
}
