import { demoConnectorTrust, demoExecutionReadiness, demoTrustFindings, demoTrustSummary } from '../data/demo'
import { useLiveResource } from './useLiveResource'
import { useWorkspace } from '../lib/workspaceContext'

export type DataTrustData = {
  summary: Omit<typeof demoTrustSummary, 'globalTrustBand'> & { globalTrustBand: 'TRUSTED' | 'HIGH' | 'INVESTIGATE' | 'LOW_CONFIDENCE' | 'BLOCKED' }
  connectors: typeof demoConnectorTrust
  findings: typeof demoTrustFindings
  readiness: typeof demoExecutionReadiness
}

const emptyData: DataTrustData = {
  summary: { ...demoTrustSummary, globalTrustScore: 0, globalTrustBand: 'BLOCKED', globalTrustLabel: 'Data trust not available yet', globalTrustReasons: ['Connect and sync your first data source to calculate trust.'], executionEligibleValue: 0, approvalRequiredValue: 0, blockedByTrustValue: 0, blockedByPolicyValue: 0, manualOnlyValue: 0, trustIssueCount: 0, identityConflictCount: 0, missingOwnerCount: 0, staleSourceCount: 0, connectorDegradedCount: 0 },
  connectors: [],
  findings: [],
  readiness: { ...demoExecutionReadiness, executionEligibleValue: 0, approvalRequiredValue: 0, blockedByTrustValue: 0, blockedByPolicyValue: 0, manualOnlyValue: 0, breakdown: [] },
}

export const trustApiPaths = ['/api/trust/summary', '/api/trust/connectors', '/api/trust/findings', '/api/trust/readiness']

function normalizeTrustPayload(payload: unknown): DataTrustData {
  const [summary, connectors, findings, readiness] = Array.isArray(payload) ? payload : []
  return {
    summary: (summary ?? emptyData.summary) as DataTrustData['summary'],
    connectors: (Array.isArray(connectors) ? connectors : []) as DataTrustData['connectors'],
    findings: (Array.isArray(findings) ? findings : []) as DataTrustData['findings'],
    readiness: (readiness ?? emptyData.readiness) as DataTrustData['readiness'],
  }
}

export function useDataTrustData() {
  const workspace = useWorkspace()
  const live = useLiveResource<DataTrustData>({
    path: trustApiPaths,
    enabled: workspace.mode === 'live',
    requireDataReady: true,
    initialData: emptyData,
    normalizer: normalizeTrustPayload,
    isEmpty: (data) => data.connectors.length === 0 && data.findings.length === 0 && data.summary.trustIssueCount === 0 && data.summary.globalTrustScore === 0,
  })
  if (workspace.mode === 'demo') {
    return { data: { summary: demoTrustSummary, connectors: demoConnectorTrust, findings: demoTrustFindings, readiness: demoExecutionReadiness }, loading: false, error: null, isEmptyLive: false, refresh: () => Promise.resolve({ summary: demoTrustSummary, connectors: demoConnectorTrust, findings: demoTrustFindings, readiness: demoExecutionReadiness }) }
  }
  return { data: live.data, loading: live.loading, error: live.error, isEmptyLive: !workspace.dataReady || live.isEmpty, refresh: live.refresh }
}
