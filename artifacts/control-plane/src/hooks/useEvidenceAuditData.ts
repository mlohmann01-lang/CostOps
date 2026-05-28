import { useMemo } from 'react'
import { demoEvidenceAudit } from '../data/demo'
import { useWorkspace } from '../lib/workspaceContext'

const emptyEvidenceAudit = {
  stats: { governanceEvents: 0, certsIssued: 0, proofChains: 0, exportsReady: 0 },
  filters: [],
  timeline: [],
}

export function useEvidenceAuditData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoEvidenceAudit }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: emptyEvidenceAudit }
    return { loading: false, isEmptyLive: false, data: emptyEvidenceAudit }
  }, [workspace])
}
