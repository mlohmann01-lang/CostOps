import { useCallback, useMemo } from 'react'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyEvidenceAudit, normalizeEvidenceAudit } from '../lib/liveNormalizers'
import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'

export function useEvidenceAuditData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const normalizeLive = useCallback((payload: unknown) => normalizeEvidenceAudit(payload, workspace.tenantId), [workspace.tenantId])
  const live = useLiveResource({ path: '/api/events', enabled: workspace.mode === 'live', initialData: emptyEvidenceAudit, normalizer: normalizeLive, isEmpty: (data) => data.timeline.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.evidenceAudit), isEmptyLive: false, data: demo.evidenceAudit }
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: !workspace.dataReady || live.isEmpty, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
