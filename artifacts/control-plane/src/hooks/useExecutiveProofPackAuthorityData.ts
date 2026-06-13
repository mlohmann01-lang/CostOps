import { useEffect, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExecutiveProofPackType =
  | 'BOARD_PACK' | 'CFO_PACK' | 'CIO_PACK'
  | 'PROCUREMENT_PACK' | 'AUDIT_PACK' | 'OPERATOR_PACK'

export type ExecutiveProofPackStatus =
  | 'DRAFT' | 'READY' | 'INCOMPLETE' | 'EXPORTED' | 'ARCHIVED'

export type ExecutiveProofSummary = {
  projectedAnnualValue: number
  approvedAnnualValue: number
  executedAnnualValue: number
  verifiedAnnualValue: number
  protectedAnnualValue: number
  driftedAnnualValue: number
  retainedAnnualValue: number
  certifiedWedges: number
  totalWedges: number
  openActions: number
  blockedActions: number
  approvalPending: number
  driftFindingsOpen: number
  evidenceConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
}

export type ProofPackCompleteness = {
  ready: boolean
  score: number
  hasCertifiedWedgeEvidence: boolean
  hasApprovalEvidence: boolean
  hasExecutionEvidence: boolean
  hasVerificationEvidence: boolean
  hasOutcomeEvidence: boolean
  hasProtectionEvidence: boolean
  hasDriftEvidence: boolean
  hasPortfolioSummary: boolean
  missingItems: string[]
}

export type ExecutiveProofSection = {
  id: string
  title: string
  sectionType: string
  narrative: string
  metrics: Record<string, number | string | boolean>
  evidenceIds: string[]
  sourceRefs: string[]
}

export type ExecutiveProofPack = {
  id: string
  tenantId: string
  packType: ExecutiveProofPackType
  status: ExecutiveProofPackStatus
  title: string
  periodStart: string
  periodEnd: string
  audience: 'BOARD' | 'CFO' | 'CIO' | 'PROCUREMENT' | 'AUDIT' | 'OPERATIONS'
  summary: ExecutiveProofSummary
  sections: ExecutiveProofSection[]
  evidenceIds: string[]
  actionIds: string[]
  outcomeIds: string[]
  protectedOutcomeIds: string[]
  wedgeIds: string[]
  completeness: ProofPackCompleteness
  generatedAt: string
  exportedAt?: string
  createdAt: string
  updatedAt: string
}

export type ExecutiveProofPackExportReadiness = {
  tenantId: string
  packId: string
  ready: boolean
  score: number
  missingItems: string[]
  exportFormats: Array<'PDF' | 'DOCX' | 'JSON'>
  generatedAt: string
}

export type ExecutiveProofPackAuthoritySummary = {
  totalPacks: number
  readyPacks: number
  incompletePacks: number
  exportedPacks: number
  boardPackReady: boolean
  cfoPackReady: boolean
  cioPackReady: boolean
  procurementPackReady: boolean
  auditPackReady: boolean
  projectedAnnualValue: number
  verifiedAnnualValue: number
  protectedAnnualValue: number
  driftedAnnualValue: number
  certifiedWedges: number
  totalWedges: number
  blockers: string[]
}

export type ExecutiveProofPackAuthorityData = {
  summary: ExecutiveProofPackAuthoritySummary
  packs: ExecutiveProofPack[]
  isDemo: boolean
  loading: boolean
  error: string | null
  generatePack: (packType: ExecutiveProofPackType) => Promise<ExecutiveProofPack | null>
  markExported: (packId: string) => Promise<void>
  archivePack: (packId: string) => Promise<void>
  fetchExportReadiness: (packId: string) => Promise<ExecutiveProofPackExportReadiness | null>
}

// ─── API Paths ─────────────────────────────────────────────────────────────────

export const executiveProofPackAuthorityApiPaths = [
  '/api/executive-proof-packs/summary',
  '/api/executive-proof-packs',
] as const

// ─── Demo Fallback ─────────────────────────────────────────────────────────────

const now = new Date().toISOString()
const PERIOD = { periodStart: '2026-01-01T00:00:00.000Z', periodEnd: '2026-12-31T23:59:59.999Z' }

const demoSummary: ExecutiveProofSummary = {
  projectedAnnualValue: 4_800_000,
  approvedAnnualValue: 3_600_000,
  executedAnnualValue: 2_880_000,
  verifiedAnnualValue: 3_700_000,
  protectedAnnualValue: 3_800_000,
  driftedAnnualValue: 120_000,
  retainedAnnualValue: 3_680_000,
  certifiedWedges: 7,
  totalWedges: 8,
  openActions: 12,
  blockedActions: 3,
  approvalPending: 5,
  driftFindingsOpen: 2,
  evidenceConfidence: 'HIGH',
}

function demoSection(type: string, title: string, narrative: string): ExecutiveProofSection {
  return { id: `demo-${type}`, title, sectionType: type, narrative, metrics: { certifiedWedges: 7, totalWedges: 8 }, evidenceIds: [], sourceRefs: ['certified-wedge-registry', 'technology-portfolio-authority'] }
}

function demoPack(id: string, packType: ExecutiveProofPackType, status: ExecutiveProofPackStatus, sections: ExecutiveProofSection[], completenessScore: number): ExecutiveProofPack {
  const titles: Record<ExecutiveProofPackType, string> = {
    BOARD_PACK: 'Board Pack — Strategic Value & Certified Wedge Coverage',
    CFO_PACK: 'CFO Pack — Financial Value Bridge & Protected Outcomes',
    CIO_PACK: 'CIO Pack — Technology Estate Health & Governance',
    PROCUREMENT_PACK: 'Procurement Pack — Contracts, Renewals & Savings',
    AUDIT_PACK: 'Audit Pack — Traceability, Evidence & Compliance',
    OPERATOR_PACK: 'Operator Pack — Actions, Readiness & Drift Remediation',
  }
  const audiences: Record<ExecutiveProofPackType, ExecutiveProofPack['audience']> = {
    BOARD_PACK: 'BOARD', CFO_PACK: 'CFO', CIO_PACK: 'CIO', PROCUREMENT_PACK: 'PROCUREMENT', AUDIT_PACK: 'AUDIT', OPERATOR_PACK: 'OPERATIONS',
  }
  return {
    id, tenantId: 'demo', packType, status, title: titles[packType], ...PERIOD,
    audience: audiences[packType], summary: demoSummary, sections,
    evidenceIds: ['ev-1', 'ev-2'],
    actionIds: ['act-1', 'act-2'],
    outcomeIds: ['out-1'],
    protectedOutcomeIds: ['prot-1'],
    wedgeIds: ['m365', 'ai', 'servicenow', 'aws', 'azure', 'data-platform', 'itam'],
    completeness: {
      ready: status === 'READY' || status === 'EXPORTED',
      score: completenessScore,
      hasCertifiedWedgeEvidence: true,
      hasApprovalEvidence: completenessScore >= 85,
      hasExecutionEvidence: completenessScore >= 85,
      hasVerificationEvidence: true,
      hasOutcomeEvidence: completenessScore >= 85,
      hasProtectionEvidence: true,
      hasDriftEvidence: completenessScore >= 85,
      hasPortfolioSummary: true,
      missingItems: status === 'INCOMPLETE' ? ['Renewal and approval evidence missing'] : [],
    },
    generatedAt: now, createdAt: now, updatedAt: now,
  }
}

const boardSections = [
  demoSection('EXECUTIVE_SUMMARY', 'Executive Summary', 'Certen has certified 7 of 8 wedges for controlled execution. $3.7M of annualized value was verified and $3.8M is currently protected. 3 actions remain blocked.'),
  demoSection('VALUE_BRIDGE', 'Value Bridge', 'Value progressed from $4.8M projected through $3.6M approved, $2.9M executed, $3.7M verified, with $3.8M protected and $3.7M retained.'),
  demoSection('CERTIFIED_WEDGES', 'Certified Wedges', '7 of 8 wedges are certified for controlled execution with full lifecycle completion.'),
  demoSection('PORTFOLIO_HEALTH', 'Portfolio Health', 'The portfolio contains 1,248 assets with 87% owner coverage and 14 high-risk assets requiring attention.'),
  demoSection('PROTECTED_VALUE', 'Protected Value', '$3.8M of annualized value is protected by outcome protection policies.'),
  demoSection('RISKS_AND_BLOCKERS', 'Risks and Blockers', '3 actions are blocked. 14 high-risk portfolio assets require remediation.'),
  demoSection('RECOMMENDED_DECISIONS', 'Recommended Decisions', 'Unblock 3 stalled governed actions by resolving trust and connector readiness prerequisites.'),
  demoSection('EVIDENCE_INDEX', 'Evidence Index', 'Evidence spans 7 certified wedges with HIGH confidence rating.'),
]

const cfoSections = [
  demoSection('EXECUTIVE_SUMMARY', 'Executive Summary', 'Financial value bridge shows $4.8M projected, $3.6M approved, $2.9M executed, and $3.7M verified. $3.8M is protected. $120K drifted.'),
  demoSection('VALUE_BRIDGE', 'Value Bridge', 'Full value bridge from projected to protected.'),
  demoSection('PORTFOLIO_HEALTH', 'Portfolio Health', 'Portfolio annual cost: $2.9M with 87% owner coverage.'),
  demoSection('OUTCOMES', 'Economic Outcomes', '$3.7M verified annualized value from 7 certified wedges.'),
  demoSection('PROTECTED_VALUE', 'Protected Value', '$3.8M protected with $120K drifted.'),
  demoSection('DRIFT', 'Drift Monitoring', '2 open drift findings. $120K drifted from protected state.'),
  demoSection('EVIDENCE_INDEX', 'Evidence Index', 'HIGH evidence confidence across 7 certified wedges.'),
]

const cioSections = [
  demoSection('EXECUTIVE_SUMMARY', 'Executive Summary', 'Technology estate spans 1,248 assets across 7 certified wedges with 87% owner coverage. 12 governed actions open.'),
  demoSection('PORTFOLIO_HEALTH', 'Portfolio Health', '1,248 assets, 87% owner coverage, 14 high-risk assets.'),
  demoSection('CERTIFIED_WEDGES', 'Certified Wedges', '7 of 8 wedges certified for controlled execution.'),
  demoSection('ACTIONS', 'Governed Actions', '12 open actions, 3 blocked, 5 pending approval.'),
  demoSection('EXECUTIONS', 'Governed Executions', 'All executions performed under controlled execution policy.'),
  demoSection('PROTECTED_VALUE', 'Protected Value', '$3.8M protected across all certified wedges.'),
  demoSection('RISKS_AND_BLOCKERS', 'Risks and Blockers', '3 actions blocked, 14 high-risk assets, 3 renewals due.'),
  demoSection('EVIDENCE_INDEX', 'Evidence Index', 'HIGH evidence confidence.'),
]

const procurementSections = [
  demoSection('EXECUTIVE_SUMMARY', 'Executive Summary', '3 contracts due within 90 days. $3.7M in verified savings. 5 approvals pending.'),
  demoSection('VALUE_BRIDGE', 'Value Bridge', '$4.8M projected to $3.7M verified.'),
  demoSection('PORTFOLIO_HEALTH', 'Portfolio Health', '3 contracts due, $2.9M annual portfolio cost.'),
  demoSection('APPROVALS', 'Approval Authority', '5 actions pending approval sign-off.'),
  demoSection('OUTCOMES', 'Economic Outcomes', '$3.7M verified savings.'),
  demoSection('RISKS_AND_BLOCKERS', 'Risks and Blockers', '3 renewals due within 90 days.'),
  demoSection('EVIDENCE_INDEX', 'Evidence Index', 'HIGH confidence evidence available.'),
]

const auditSections = [
  demoSection('EXECUTIVE_SUMMARY', 'Executive Summary', 'All governed actions traced through full lifecycle. 7 of 8 wedges certified. HIGH evidence confidence.'),
  demoSection('CERTIFIED_WEDGES', 'Certified Wedges', '7 of 8 wedges with full lifecycle including trust, approval, execution, verification, outcome, protection and drift.'),
  demoSection('APPROVALS', 'Approval Authority', 'All governed actions require trust and approval authority validation.'),
  demoSection('EXECUTIONS', 'Governed Executions', 'All executions under controlled execution with pre/post-state capture.'),
  demoSection('OUTCOMES', 'Economic Outcomes', '$3.7M verified across all certified wedges.'),
  demoSection('PROTECTED_VALUE', 'Protected Value', '$3.8M protected with drift monitoring.'),
  demoSection('DRIFT', 'Drift Monitoring', '2 open drift findings, $120K drifted value.'),
  demoSection('EVIDENCE_INDEX', 'Evidence Index', 'HIGH confidence. Full evidence linkage from wedge to outcome.'),
]

const operatorSections = [
  demoSection('EXECUTIVE_SUMMARY', 'Executive Summary', '12 actions open, 5 pending approval, 2 drift findings require remediation. 3 actions blocked.'),
  demoSection('ACTIONS', 'Governed Actions', '12 open, 3 blocked by missing prerequisites.'),
  demoSection('APPROVALS', 'Approval Authority', '5 actions awaiting approval.'),
  demoSection('EXECUTIONS', 'Governed Executions', 'Execution readiness checked for all open actions.'),
  demoSection('DRIFT', 'Drift Monitoring', '2 open drift findings requiring remediation.'),
  demoSection('RISKS_AND_BLOCKERS', 'Risks and Blockers', '3 actions blocked, 3 renewals due within 90 days.'),
  demoSection('RECOMMENDED_DECISIONS', 'Recommended Decisions', 'Unblock 3 stalled actions, review 3 upcoming contract renewals.'),
]

export const demoPacks: ExecutiveProofPack[] = [
  demoPack('demo-board', 'BOARD_PACK', 'READY', boardSections, 100),
  demoPack('demo-cfo', 'CFO_PACK', 'READY', cfoSections, 100),
  demoPack('demo-cio', 'CIO_PACK', 'READY', cioSections, 100),
  demoPack('demo-proc', 'PROCUREMENT_PACK', 'INCOMPLETE', procurementSections, 62),
  demoPack('demo-audit', 'AUDIT_PACK', 'READY', auditSections, 100),
  demoPack('demo-oper', 'OPERATOR_PACK', 'READY', operatorSections, 87),
]

export const demoExecutiveProofPackAuthoritySummary: ExecutiveProofPackAuthoritySummary = {
  totalPacks: 6,
  readyPacks: 5,
  incompletePacks: 1,
  exportedPacks: 0,
  boardPackReady: true,
  cfoPackReady: true,
  cioPackReady: true,
  procurementPackReady: false,
  auditPackReady: true,
  projectedAnnualValue: 4_800_000,
  verifiedAnnualValue: 3_700_000,
  protectedAnnualValue: 3_800_000,
  driftedAnnualValue: 120_000,
  certifiedWedges: 7,
  totalWedges: 8,
  blockers: ['PROCUREMENT pack not ready'],
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useExecutiveProofPackAuthorityData(): ExecutiveProofPackAuthorityData {
  const [state, setState] = useState<Omit<ExecutiveProofPackAuthorityData, 'generatePack' | 'markExported' | 'archivePack' | 'fetchExportReadiness'>>({
    summary: demoExecutiveProofPackAuthoritySummary,
    packs: demoPacks,
    isDemo: true,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [summaryRes, packsRes] = await Promise.all([
          fetch('/api/executive-proof-packs/summary'),
          fetch('/api/executive-proof-packs'),
        ])
        if (!summaryRes.ok || !packsRes.ok) throw new Error('Executive Proof Pack APIs unavailable')
        const [summary, packs] = await Promise.all([
          summaryRes.json() as Promise<ExecutiveProofPackAuthoritySummary>,
          packsRes.json() as Promise<ExecutiveProofPack[]>,
        ])
        if (!cancelled) setState({ summary, packs, isDemo: false, loading: false, error: null })
      } catch (err) {
        if (!cancelled) setState((prev) => ({ ...prev, isDemo: true, loading: false, error: String(err) }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const generatePack = useCallback(async (packType: ExecutiveProofPackType): Promise<ExecutiveProofPack | null> => {
    if (state.isDemo) return null
    try {
      const res = await fetch('/api/executive-proof-packs/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packType }) })
      const pack = await res.json() as ExecutiveProofPack
      setState((prev) => ({ ...prev, packs: [...prev.packs.filter((p) => p.packType !== packType), pack] }))
      return pack
    } catch { return null }
  }, [state.isDemo])

  const markExported = useCallback(async (packId: string) => {
    if (state.isDemo) return
    try {
      const res = await fetch(`/api/executive-proof-packs/${packId}/exported`, { method: 'POST' })
      const pack = await res.json() as ExecutiveProofPack
      setState((prev) => ({ ...prev, packs: prev.packs.map((p) => p.id === packId ? pack : p) }))
    } catch { /* swallow */ }
  }, [state.isDemo])

  const archivePack = useCallback(async (packId: string) => {
    if (state.isDemo) return
    try {
      const res = await fetch(`/api/executive-proof-packs/${packId}/archive`, { method: 'POST' })
      const pack = await res.json() as ExecutiveProofPack
      setState((prev) => ({ ...prev, packs: prev.packs.map((p) => p.id === packId ? pack : p) }))
    } catch { /* swallow */ }
  }, [state.isDemo])

  const fetchExportReadiness = useCallback(async (packId: string): Promise<ExecutiveProofPackExportReadiness | null> => {
    if (state.isDemo) return null
    try {
      const res = await fetch(`/api/executive-proof-packs/${packId}/export-readiness`)
      return await res.json() as ExecutiveProofPackExportReadiness
    } catch { return null }
  }, [state.isDemo])

  return { ...state, generatePack, markExported, archivePack, fetchExportReadiness }
}
