import { Shell } from '../components/layout/Shell'
import { CommandBar } from '../components/layout/CommandBar'
import { isDemoMode } from '../lib/demo/demo-action-policy'

export default function SettingsPage() {
  return <Shell><div style={{ padding: 20 }}><h1>Settings</h1><p>Read-only workspace settings.</p><ul><li>Tenant ID: demo-tenant</li><li>Tenant mode: {isDemoMode() ? 'DEMO' : 'PRODUCTION'}</li><li>Role: OPERATOR</li><li>Environment: demo</li><li>Live execution enabled: false</li><li>Connector mode: mixed</li><li>RBAC capabilities: approve, review, schedule (demo)</li><li>Demo guide: restart from Command page banner in demo workspace</li></ul></div><CommandBar /></Shell>
}
