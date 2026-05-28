import { Shell } from '../components/layout/Shell'
import { EmptyState, SectionLabel } from '../components/shared/Foundation'
import { useSettingsData } from '../hooks/useSettingsData'

function SettingGroup({ title, values, readOnly }: { title: string; values: Record<string, string>; readOnly: boolean }) {
  return <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12, opacity: readOnly ? 0.78 : 1 }}><SectionLabel>{title}</SectionLabel>{Object.entries(values).map(([key, value]) => <label key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: 'var(--border-subtle)', color: readOnly ? 'var(--text-tertiary)' : 'var(--text-primary)' }}><span>{key}</span><input value={value} disabled={readOnly} readOnly style={{ background: readOnly ? 'var(--bg-muted)' : 'var(--bg-card)', border: 'var(--border-default)', borderRadius: 6, padding: 8, color: 'inherit' }} /></label>)}</section>
}

export default function SettingsPage() {
  const { data, isEmptyLive, readOnly } = useSettingsData()
  if (isEmptyLive) return <Shell><EmptyState title='No workspace settings yet' description='Settings will appear once a live workspace configuration is available.' /></Shell>

  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <div><SectionLabel>Platform administration</SectionLabel><h1>Settings</h1><p style={{ color: 'var(--text-secondary)' }}>{readOnly ? 'Demo mode is read-only. Controls are disabled.' : 'Workspace controls are editable.'}</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><SettingGroup title='Workspace config' values={data.workspace} readOnly={readOnly} /><SettingGroup title='Governance defaults' values={data.governanceDefaults} readOnly={readOnly} /><SettingGroup title='Notification settings' values={data.notifications} readOnly={readOnly} /><SettingGroup title='Retention settings' values={data.retention} readOnly={readOnly} /></div>
    <section style={{ border: '1px solid var(--red)', borderRadius: 10, padding: 12, opacity: 0.7 }}><SectionLabel>Danger zone</SectionLabel>{Object.entries(data.dangerZone).map(([key, value]) => <button key={key} disabled style={{ marginRight: 8, opacity: 0.6 }}>{key}: {String(value)}</button>)}</section>
  </div></Shell>
}
