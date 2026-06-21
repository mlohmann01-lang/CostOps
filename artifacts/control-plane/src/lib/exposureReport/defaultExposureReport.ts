import { getDefaultEconomicControlChain, type EconomicControlChainSummary } from '../economicControlChain/defaultEconomicControlChain'

// ─── Section 1 — Executive Summary ──────────────────────────────────────────

export interface ExposureSummaryMetrics {
  potentialAnnualValue?: number
  inactiveLicences?: number
  ownerlessLicences?: number
  copilotExposure?: number
  governanceFindings?: number
  exposureScore?: number // 0-100
}

// ─── Section 2 — Key Findings ───────────────────────────────────────────────

export interface KeyFinding {
  finding: string
  impact: string
  recommendedAction: string
  potentialValue?: number
}

export const MAX_KEY_FINDINGS = 5

// ─── Section 3 — Exposure Domains ───────────────────────────────────────────

export type ExposureDomainName = 'Microsoft 365' | 'AI' | 'Ownership' | 'Governance' | 'Renewals'

export interface ExposureDomain {
  domain: ExposureDomainName
  status: string
  issueCount?: number
  potentialValue?: number | 'Awaiting discovery'
}

export const EXPOSURE_DOMAIN_NAMES: ExposureDomainName[] = ['Microsoft 365', 'AI', 'Ownership', 'Governance', 'Renewals']

// ─── Section 5 — What Happens Next ──────────────────────────────────────────

export interface NextStep {
  step: number
  label: string
}

export const NEXT_STEPS: NextStep[] = [
  { step: 1, label: 'Validate Findings' },
  { step: 2, label: 'Assign Ownership' },
  { step: 3, label: 'Review Opportunities' },
  { step: 4, label: 'Approve Actions' },
  { step: 5, label: 'Verify Outcomes' },
  { step: 6, label: 'Protect Value' },
]

// ─── Section 6 — About This Review ──────────────────────────────────────────

export const TRUST_ASSURANCES: string[] = [
  'Read-only review',
  'No changes made',
  'Discovery only',
  'No licence modifications',
  'No automated execution',
  'Access can be revoked at any time',
]

// ─── Bottom Expansion Block ──────────────────────────────────────────────────

export const EXPANSION_BLOCK_TEXT =
  'These findings represent one technology domain. Similar exposure often exists across AI, SaaS, cloud, renewals, ownership and technology investments. Certen applies the Economic Control Chain across all technology investments.'

// ─── Report Model ────────────────────────────────────────────────────────────

export interface ExposureReportSection {
  id: number
  title: string
}

export const REPORT_SECTIONS: ExposureReportSection[] = [
  { id: 1, title: 'Executive Summary' },
  { id: 2, title: 'Key Findings' },
  { id: 3, title: 'Exposure Domains' },
  { id: 4, title: 'Economic Control Readiness' },
  { id: 5, title: 'What Happens Next' },
  { id: 6, title: 'About This Review' },
]

export interface ExposureReport {
  title: string
  generatedAt?: string
  sections: ExposureReportSection[]
  summary: ExposureSummaryMetrics
  keyFindings: KeyFinding[]
  domains: ExposureDomain[]
  economicControlChain: EconomicControlChainSummary
  nextSteps: NextStep[]
  trustAssurances: string[]
  expansionBlock: string
}

export const REPORT_TITLE = 'AI & Technology Exposure Report'

export function getDefaultExposureReport(): ExposureReport {
  // Honest-data bias: the platform's current maturity (consistent with the
  // Outcome Finance and Economic Control Chain defaults) is early-stage —
  // Microsoft 365 discovery is the most mature signal source, AI/Ownership/
  // Governance/Renewals domains are tracked but largely awaiting deeper
  // discovery, so most of those values are intentionally left undefined and
  // rendered as "Not available" / "Awaiting discovery" rather than fabricated.
  const summary: ExposureSummaryMetrics = {
    potentialAnnualValue: 320000,
    inactiveLicences: 184,
    ownerlessLicences: 47,
    copilotExposure: undefined,
    governanceFindings: 12,
    exposureScore: 62,
  }

  const keyFindings: KeyFinding[] = [
    {
      finding: '184 Microsoft 365 licences show no sign-in activity in the last 90 days.',
      impact: 'Ongoing licence spend is being paid for accounts that show no evidence of use.',
      recommendedAction: 'Recommend reviewing inactive licence assignments with department owners before renewal.',
      potentialValue: 184000,
    },
    {
      finding: '47 licences have no identifiable accountable owner.',
      impact: 'Ownership gaps make it difficult to validate whether spend is still required.',
      recommendedAction: 'Recommend assigning an accountable owner to each unowned licence.',
      potentialValue: 47000,
    },
    {
      finding: 'Copilot and AI feature usage could not be confirmed from current discovery sources.',
      impact: 'Exposure from AI-enabled licensing add-ons cannot yet be quantified.',
      recommendedAction: 'Recommend connecting AI usage telemetry to validate Copilot exposure.',
      potentialValue: undefined,
    },
    {
      finding: '12 governance findings were identified relating to access and licence assignment controls.',
      impact: 'Unresolved governance findings increase audit and compliance risk.',
      recommendedAction: 'Recommend validating each governance finding with the relevant control owner.',
      potentialValue: undefined,
    },
    {
      finding: 'Renewal terms for several Microsoft 365 plans have not yet been benchmarked.',
      impact: 'Renewal exposure is not yet quantified, which may understate negotiation leverage.',
      recommendedAction: 'Recommend reviewing upcoming renewal terms against benchmark pricing.',
      potentialValue: undefined,
    },
  ]

  const domains: ExposureDomain[] = [
    { domain: 'Microsoft 365', status: 'Active discovery', issueCount: 12, potentialValue: 320000 },
    { domain: 'AI', status: 'Awaiting discovery', issueCount: 2, potentialValue: 'Awaiting discovery' },
    { domain: 'Ownership', status: 'Partial discovery', issueCount: 47, potentialValue: 47000 },
    { domain: 'Governance', status: 'Active discovery', issueCount: 12, potentialValue: 'Awaiting discovery' },
    { domain: 'Renewals', status: 'Awaiting discovery', issueCount: 1, potentialValue: 'Awaiting discovery' },
  ]

  return {
    title: REPORT_TITLE,
    generatedAt: undefined,
    sections: REPORT_SECTIONS,
    summary,
    keyFindings: keyFindings.slice(0, MAX_KEY_FINDINGS),
    domains,
    economicControlChain: getDefaultEconomicControlChain(),
    nextSteps: NEXT_STEPS,
    trustAssurances: TRUST_ASSURANCES,
    expansionBlock: EXPANSION_BLOCK_TEXT,
  }
}
