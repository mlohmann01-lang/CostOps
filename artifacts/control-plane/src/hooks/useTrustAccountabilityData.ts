import { useCallback, useEffect, useMemo, useState } from 'react'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { assignTrustTask, escalateTrustTask, recomputeAccountabilityRollup, useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { useWorkspace } from '../lib/workspaceContext'

export type TrustTaskOwner = { ownerId?: string; ownerName: string; ownerType?: 'USER' | 'TEAM' | 'SYSTEM' }

export function useTrustAccountabilityData() {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const [accountability, setAccountability] = useState<any | null>(null)
  const [overdueTasks, setOverdueTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const demoAccountability = useMemo(() => ({ tenantId: 'demo-sandbox-tenant', rollup: recomputeAccountabilityRollup(demo.trustResolutionTasks), tasks: demo.trustResolutionTasks }), [demo.trustResolutionTasks])

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demoAccountability
    if (!workspace.dataReady) { setAccountability(null); setOverdueTasks([]); setError(null); return null }
    setLoading(true)
    try {
      const [rollup, overdue] = await Promise.all([
        liveFetch<any>('/api/trust/accountability'),
        liveFetch<any>('/api/trust/accountability/overdue'),
      ])
      setAccountability(rollup)
      setOverdueTasks(Array.isArray(overdue) ? overdue : overdue.tasks ?? [])
      setError(null)
      return rollup
    } catch (err) {
      setAccountability(null)
      setOverdueTasks([])
      setError(normalizeApiError(err))
      return null
    } finally {
      setLoading(false)
    }
  }, [workspace.mode, workspace.dataReady, demoAccountability])

  useEffect(() => { void refresh() }, [refresh])

  const assignTask = useCallback(async (taskId: string, owner: TrustTaskOwner) => {
    if (workspace.mode === 'demo') return assignTrustTask(taskId, owner)
    if (!workspace.dataReady) return null
    try {
      const out = await liveFetch<any>(`/api/trust/tasks/${encodeURIComponent(taskId)}/assign`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(owner) })
      await refresh()
      return out.task
    } catch (err) { setError(normalizeApiError(err)); return null }
  }, [workspace.mode, workspace.dataReady, refresh])

  const escalateTask = useCallback(async (taskId: string, reason = 'Operator escalation') => {
    if (workspace.mode === 'demo') return escalateTrustTask(taskId, reason)
    if (!workspace.dataReady) return null
    try {
      const out = await liveFetch<any>(`/api/trust/tasks/${encodeURIComponent(taskId)}/escalate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) })
      await refresh()
      return out.task
    } catch (err) { setError(normalizeApiError(err)); return null }
  }, [workspace.mode, workspace.dataReady, refresh])

  const activeAccountability = workspace.mode === 'demo' ? demoAccountability : accountability
  const activeOverdue = workspace.mode === 'demo' ? demo.trustResolutionTasks.filter((task: any) => task.slaStatus === 'OVERDUE' || task.escalationLevel !== 'NONE') : overdueTasks
  return { accountability: activeAccountability, overdueTasks: activeOverdue, loading, error, assignTask, escalateTask, refresh }
}
