import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type EvidenceContextRecord = {
  id: string
  evidenceRef: string
  title?: string
  description?: string
  evidenceType?: string
  sourceSystem?: string
  status?: string
  classification?: string
  trustLevel?: string
  collectedAt?: string
  validatedAt?: string
}

export type EvidenceContextData = { records: EvidenceContextRecord[]; dataState: DataState; error?: string }

export type UseEvidenceContextOptions = { evidenceIds?: string[]; targetType?: string; targetId?: string }

function demoEvidenceRecord(ref: string): EvidenceContextRecord {
  return {
    id: ref, evidenceRef: ref, title: `Evidence ${ref}`, description: 'Synthetic sample evidence record.',
    evidenceType: 'document', sourceSystem: 'demo-sandbox', status: 'validated', classification: 'internal',
    trustLevel: 'HIGH', collectedAt: new Date().toISOString(), validatedAt: new Date().toISOString(),
  }
}

export function demoEvidenceRecords(refs?: string[]): EvidenceContextRecord[] {
  const ids = refs && refs.length > 0 ? refs : ['demo-evidence-001', 'demo-evidence-002']
  return ids.map(demoEvidenceRecord)
}

export function useEvidenceContext({ evidenceIds, targetType, targetId }: UseEvidenceContextOptions) {
  const workspace = useWorkspace()
  const [data, setData] = useState<EvidenceContextData>({ records: [], dataState: 'DEMO' })
  const [loading, setLoading] = useState(false)

  const hasKey = (evidenceIds && evidenceIds.length > 0) || (!!targetType && !!targetId)

  const refresh = useCallback(async () => {
    if (!hasKey) { setData({ records: [], dataState: 'NO_DATA' }); return }
    if (workspace.mode === 'demo') { setData({ records: demoEvidenceRecords(evidenceIds), dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData({ records: [], dataState: 'NOT_CONNECTED' }); return }
    setLoading(true)
    try {
      let records: EvidenceContextRecord[] = []
      if (evidenceIds && evidenceIds.length > 0) {
        const results = await Promise.all(evidenceIds.map((ref) =>
          liveFetch<EvidenceContextRecord>(`/api/evidence-registry/records/${encodeURIComponent(ref)}`).catch(() => null)
        ))
        records = results.filter((r): r is EvidenceContextRecord => !!r)
      } else if (targetType && targetId) {
        records = await liveFetch<EvidenceContextRecord[]>(`/api/evidence-registry/targets/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`)
      }
      setData({ records, dataState: records.length > 0 ? 'LIVE' : 'NO_DATA' })
    } catch (error) {
      const err = normalizeApiError(error)
      setData({ records: [], dataState: 'NO_DATA', error: err.message })
    } finally { setLoading(false) }
  }, [hasKey, evidenceIds, targetType, targetId, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
