import { useCallback, useMemo } from 'react'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyEvidenceAudit, normalizeEvidenceAudit } from '../lib/liveNormalizers'
import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'

export type EvidenceAuditDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export function useEvidenceAuditData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const normalizeLive = useCallback((payload: unknown) => normalizeEvidenceAudit(payload, workspace.tenantId), [workspace.tenantId])
  const live = useLiveResource({ path: '/api/events', enabled: workspace.mode === 'live', initialData: emptyEvidenceAudit, normalizer: normalizeLive, isEmpty: (data) => data.timeline.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.evidenceAudit), isEmptyLive: false, dataState: 'DEMO' as EvidenceAuditDataState, data: demo.evidenceAudit }
    if (!workspace.dataReady) return { loading: false, error: null, refresh: live.refresh, isEmptyLive: true, dataState: 'NOT_CONNECTED' as EvidenceAuditDataState, data: emptyEvidenceAudit }
    const dataState: EvidenceAuditDataState = live.error ? 'NO_DATA' : live.isEmpty ? 'NO_DATA' : 'LIVE'
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: live.isEmpty, dataState, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
