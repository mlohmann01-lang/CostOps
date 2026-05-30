import { useCallback, useEffect, useState } from 'react'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { simulateCreateTrustResolutionTask, simulateUpdateTrustResolutionTaskStatus, useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { useWorkspace } from '../lib/workspaceContext'

export type TrustResolutionTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED'

export function useTrustResolutionTasks() {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const [liveTasks, setLiveTasks] = useState<any[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo.trustResolutionTasks
    if (!workspace.dataReady) { setLiveTasks([]); setError(null); return [] }
    setLoading(true)
    try { const out = await liveFetch<any>('/api/trust/tasks'); const tasks = Array.isArray(out) ? out : out.tasks ?? []; setLiveTasks(tasks); setError(null); return tasks }
    catch (err) { const e = normalizeApiError(err); setLiveTasks([]); setError(e); return [] }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo.trustResolutionTasks])
  useEffect(() => { void refresh() }, [refresh])
  const createTask = useCallback(async (finding: any, owner = 'operator') => {
    if (workspace.mode === 'demo') return simulateCreateTrustResolutionTask(finding, owner)
    if (!workspace.dataReady) return null
    try { const out = await liveFetch<any>(`/api/trust/findings/${encodeURIComponent(finding.findingId)}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ owner }) }); await refresh(); return out.task }
    catch (err) { setError(normalizeApiError(err)); return null }
  }, [workspace.mode, workspace.dataReady, refresh])
  const setStatus = useCallback(async (taskId: string, status: TrustResolutionTaskStatus) => {
    if (workspace.mode === 'demo') return simulateUpdateTrustResolutionTaskStatus(taskId, status)
    if (!workspace.dataReady) return null
    try { const out = await liveFetch<any>(`/api/trust/tasks/${encodeURIComponent(taskId)}/status`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }); await refresh(); return out.task }
    catch (err) { setError(normalizeApiError(err)); return null }
  }, [workspace.mode, workspace.dataReady, refresh])
  return { tasks: workspace.mode === 'demo' ? demo.trustResolutionTasks : liveTasks, loading, error, refresh, createTask, setStatus }
}
