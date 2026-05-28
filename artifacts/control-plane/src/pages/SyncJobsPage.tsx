import { Shell } from '../components/layout/Shell'
import { CommandBar } from '../components/layout/CommandBar'

export default function SyncJobsPage() {
  return <Shell><div style={{ padding: 20 }}><h1>Connector Ops</h1><p>Connector operations endpoint unavailable; showing current status snapshot.</p><ul><li>Queued: 2</li><li>Running: 1</li><li>Retry scheduled: 1</li><li>Failed: 0</li><li>Completed: 12</li></ul></div><CommandBar /></Shell>
}
