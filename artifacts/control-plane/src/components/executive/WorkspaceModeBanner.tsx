import { getOperatingModeConfig, type OperatingMode } from '../../lib/operatingMode'
import { useWorkspaceMode } from '../../hooks/useWorkspaceMode'
import { StatusBadge } from './StatusBadge'

export function WorkspaceModeBanner({ mode, dataSourceOverride, executionOverride, compact = false }: { mode?: OperatingMode; dataSourceOverride?: string; executionOverride?: string; compact?: boolean }) {
  const workspaceMode = useWorkspaceMode()
  const config = getOperatingModeConfig(mode ?? workspaceMode.mode)
  const dataSource = dataSourceOverride ?? config.dataSourceLabel
  const executionMode = executionOverride ?? config.executionModeLabel
  return <section style={{ border:'1px solid rgba(45,212,191,.28)', background:'linear-gradient(135deg, rgba(45,212,191,.10), rgba(96,165,250,.06))', borderRadius:14, padding: compact ? '10px 12px' : '13px 16px', color:'var(--text-secondary)', display:'grid', gap: compact ? 8 : 10 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}><strong style={{ color:'var(--text-primary)' }}><span style={{ color:'var(--text-tertiary)' }}>Workspace Mode</span>: {config.label}</strong><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}><StatusBadge status={`Data Source: ${dataSource}`} tone='info' /><StatusBadge status={`Execution Mode: ${executionMode}`} tone={config.mode === 'DEMO' ? 'warning' : 'good'} /></div></div>
    {!compact && <p style={{ margin:0, lineHeight:1.55 }}>{config.bannerBody}</p>}
  </section>
}
