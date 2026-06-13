import { useCallback, useEffect, useState } from 'react'
import { liveFetch, normalizeApiError } from '../lib/liveApi'

export type WedgeCertificationStatus = 'CERTIFIED' | 'NOT_CERTIFIED' | 'PARTIAL' | 'IN_PROGRESS' | 'NOT_IMPLEMENTED'
export type WedgeExecutionClass = 'REAL_PROVIDER_EXECUTION' | 'CONTROLLED_EXECUTION' | 'SIMULATED_ONLY' | 'NOT_IMPLEMENTED'

export type CertifiedWedgePlaybookEntry = {
  playbookId: string
  name: string
  status: WedgeCertificationStatus
  executionClass: WedgeExecutionClass
  blockers: string[]
}

export type CertifiedWedgeRegistryEntry = {
  wedgeId: string
  name: string
  domain: 'M365' | 'AI' | 'SERVICENOW' | 'DATA_PLATFORM' | 'AWS' | 'AZURE' | 'ITAM'
  status: WedgeCertificationStatus
  executionClass: WedgeExecutionClass
  certifiedPlaybooks: number
  totalPlaybooks: number
  discoveryComplete: boolean
  trustComplete: boolean
  approvalComplete: boolean
  executionComplete: boolean
  rollbackComplete: boolean
  verificationComplete: boolean
  outcomeComplete: boolean
  protectionComplete: boolean
  driftComplete: boolean
  executiveProofComplete: boolean
  liveTenantReady: boolean
  productionReady: boolean
  blockers: string[]
  lastCertifiedAt?: string
  certificationSource: string
  playbooks: CertifiedWedgePlaybookEntry[]
}

export type CertifiedWedgeRegistrySummary = {
  totalWedges: number
  certifiedWedges: number
  partialWedges: number
  notCertifiedWedges: number
  totalPlaybooks: number
  certifiedPlaybooks: number
  controlledExecutionWedges: number
  realProviderExecutionWedges: number
  simulatedOnlyWedges: number
  liveTenantReadyWedges: number
  productionReadyWedges: number
  blockers: string[]
  wedges: CertifiedWedgeRegistryEntry[]
}

export type CertifiedWedgeRegistryData = {
  summary: CertifiedWedgeRegistrySummary
  wedges: CertifiedWedgeRegistryEntry[]
  isDemo: boolean
  loading: boolean
  error?: string
  refresh(): Promise<void>
}

export const certifiedWedgeRegistryApiPaths = ['/api/certification/wedges/summary', '/api/certification/wedges'] as const

const now = '2026-06-13T00:00:00Z'

const demoWedge = (wedgeId: string, name: string, domain: CertifiedWedgeRegistryEntry['domain'], certifiedPlaybooks: number, totalPlaybooks: number, blockers: string[] = []): CertifiedWedgeRegistryEntry => ({
  wedgeId,
  name,
  domain,
  status: certifiedPlaybooks === totalPlaybooks && totalPlaybooks > 0 ? 'CERTIFIED' : certifiedPlaybooks > 0 ? 'PARTIAL' : 'NOT_CERTIFIED',
  executionClass: 'CONTROLLED_EXECUTION',
  certifiedPlaybooks,
  totalPlaybooks,
  discoveryComplete: certifiedPlaybooks > 0,
  trustComplete: certifiedPlaybooks > 0,
  approvalComplete: certifiedPlaybooks > 0,
  executionComplete: certifiedPlaybooks > 0,
  rollbackComplete: certifiedPlaybooks > 0,
  verificationComplete: certifiedPlaybooks > 0,
  outcomeComplete: certifiedPlaybooks > 0,
  protectionComplete: certifiedPlaybooks > 0,
  driftComplete: certifiedPlaybooks > 0,
  executiveProofComplete: certifiedPlaybooks > 0,
  liveTenantReady: certifiedPlaybooks === totalPlaybooks && totalPlaybooks > 0 && blockers.length === 0,
  productionReady: certifiedPlaybooks === totalPlaybooks && totalPlaybooks > 0 && blockers.length === 0,
  blockers,
  lastCertifiedAt: certifiedPlaybooks === totalPlaybooks ? now : undefined,
  certificationSource: `${wedgeId}-wedge-certification`,
  playbooks: Array.from({ length: totalPlaybooks }, (_, i) => ({
    playbookId: `${wedgeId}-playbook-${i + 1}`,
    name: `Playbook ${i + 1}`,
    status: i < certifiedPlaybooks ? 'CERTIFIED' as WedgeCertificationStatus : 'NOT_CERTIFIED' as WedgeCertificationStatus,
    executionClass: 'CONTROLLED_EXECUTION' as WedgeExecutionClass,
    blockers: i < certifiedPlaybooks ? [] : ['Execution evidence missing'],
  })),
})

export const demoCertifiedWedgeRegistry: CertifiedWedgeRegistrySummary = (() => {
  const wedges: CertifiedWedgeRegistryEntry[] = [
    demoWedge('m365', 'M365 Cost Governance', 'M365', 5, 5),
    demoWedge('ai', 'AI Economic Control', 'AI', 4, 4),
    demoWedge('servicenow', 'ServiceNow Execution', 'SERVICENOW', 4, 4, ['ServiceNow connector health degraded']),
    demoWedge('data-platform', 'Snowflake + Databricks Data Platform', 'DATA_PLATFORM', 5, 5),
    demoWedge('aws', 'AWS Cost Governance', 'AWS', 5, 5),
    demoWedge('azure', 'Azure Cost Governance', 'AZURE', 5, 5),
    demoWedge('itam', 'ITAM / Flexera Cost Governance', 'ITAM', 5, 5, ['Evidence export pending for 2 actions']),
  ]
  const certified = wedges.filter((w) => w.status === 'CERTIFIED')
  const partial = wedges.filter((w) => w.status === 'PARTIAL')
  const notCertified = wedges.filter((w) => w.status === 'NOT_CERTIFIED')
  return {
    totalWedges: wedges.length,
    certifiedWedges: certified.length,
    partialWedges: partial.length,
    notCertifiedWedges: notCertified.length,
    totalPlaybooks: wedges.reduce((s, w) => s + w.totalPlaybooks, 0),
    certifiedPlaybooks: wedges.reduce((s, w) => s + w.certifiedPlaybooks, 0),
    controlledExecutionWedges: wedges.filter((w) => w.executionClass === 'CONTROLLED_EXECUTION').length,
    realProviderExecutionWedges: 0,
    simulatedOnlyWedges: 0,
    liveTenantReadyWedges: wedges.filter((w) => w.liveTenantReady).length,
    productionReadyWedges: wedges.filter((w) => w.productionReady).length,
    blockers: ['ServiceNow connector health degraded', 'Evidence export pending for 2 actions'],
    wedges,
  }
})()

function normalizeSummary(payload: any): CertifiedWedgeRegistrySummary {
  if (payload && typeof payload.totalWedges === 'number') return payload as CertifiedWedgeRegistrySummary
  return demoCertifiedWedgeRegistry
}

export function useCertifiedWedgeRegistryData(): CertifiedWedgeRegistryData {
  const [summary, setSummary] = useState<CertifiedWedgeRegistrySummary>(demoCertifiedWedgeRegistry)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, wedgesData] = await Promise.all([
        liveFetch<any>('/api/certification/wedges/summary'),
        liveFetch<any[]>('/api/certification/wedges'),
      ])
      setSummary(normalizeSummary({ ...summaryData, wedges: Array.isArray(wedgesData) ? wedgesData : summaryData.wedges }))
      setIsDemo(false)
      setError(undefined)
    } catch (err) {
      const normalized = normalizeApiError(err)
      setSummary(demoCertifiedWedgeRegistry)
      setIsDemo(true)
      setError(normalized.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return { summary, wedges: summary.wedges, isDemo, loading, error, refresh: load }
}
