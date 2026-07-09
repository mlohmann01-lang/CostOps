export interface OutcomeFinanceMetrics {
  identifiedValue?: number
  executedValue?: number
  verifiedValue?: number
  financeVerifiedValue?: number
  variance?: number // identifiedValue - financeVerifiedValue, or undefined if either missing
}

export interface ReconciliationSummary {
  reconciliations?: number
  linkedOutcomes?: number
  varianceRecords?: number
  confidence?: number // percent
}

export interface ReconciliationLink {
  outcome: string
  status: string
  financeEvidence: string
  confidence: number
  lastUpdated: string // ISO date
}

export type OutcomeFinanceState = 'no_data' | 'partial' | 'active'

export interface OutcomeFinanceSummary {
  metrics: OutcomeFinanceMetrics
  reconciliation: ReconciliationSummary
  links: ReconciliationLink[]
  state: OutcomeFinanceState
  narrative: string // CFO narrative based on state
  executiveNarrative: string // bottom-section narrative
}

function computeVariance(identifiedValue?: number, financeVerifiedValue?: number): number | undefined {
  if (identifiedValue === undefined || financeVerifiedValue === undefined) return undefined
  return identifiedValue - financeVerifiedValue
}

function deriveState(metrics: OutcomeFinanceMetrics, links: ReconciliationLink[]): OutcomeFinanceState {
  const hasAnyMetric =
    metrics.identifiedValue !== undefined ||
    metrics.executedValue !== undefined ||
    metrics.verifiedValue !== undefined ||
    metrics.financeVerifiedValue !== undefined
  if (!hasAnyMetric && links.length === 0) return 'no_data'
  if (metrics.financeVerifiedValue !== undefined && links.length > 0) return 'active'
  return 'partial'
}

function buildNarrative(state: OutcomeFinanceState): string {
  if (state === 'no_data') {
    return 'Outcome Finance is not yet active. Connect financial systems and link verified outcomes to begin finance reconciliation.'
  }
  if (state === 'active') {
    return 'Outcome Finance is reconciling verified outcomes against financial evidence and validated savings.'
  }
  return 'Verified outcomes exist, but finance reconciliation remains incomplete.'
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value)
}

function buildExecutiveNarrative(state: OutcomeFinanceState, metrics: OutcomeFinanceMetrics): string {
  if (state === 'no_data') {
    return 'No finance validated outcomes exist yet.'
  }
  if (state === 'active' && metrics.identifiedValue !== undefined && metrics.verifiedValue !== undefined && metrics.financeVerifiedValue !== undefined) {
    return `Certen has identified ${formatMoney(metrics.identifiedValue)} in annual value, verified ${formatMoney(metrics.verifiedValue)} through governed execution, and finance validated ${formatMoney(metrics.financeVerifiedValue)} through reconciliation.`
  }
  return 'Verified outcomes exist, but finance reconciliation remains incomplete.'
}

export function getDefaultOutcomeFinance(): OutcomeFinanceSummary {
  // Honest-data bias: consistent with the platform's actual maturity established in
  // earlier programs (mostly early-stage/partial verification, no live finance-system
  // reconciliation wired yet). Identified and verified values are sourced from the
  // same order-of-magnitude as the Outcome Ledger's projected/verified savings; finance
  // verification itself has not yet occurred, so financeVerifiedValue and links remain
  // undefined/empty until finance reconciliation is actually connected.
  const metrics: OutcomeFinanceMetrics = {
    identifiedValue: 297600,
    executedValue: 50400,
    verifiedValue: 50400,
    financeVerifiedValue: undefined,
  }
  metrics.variance = computeVariance(metrics.identifiedValue, metrics.financeVerifiedValue)

  const reconciliation: ReconciliationSummary = {
    reconciliations: 0,
    linkedOutcomes: 0,
    varianceRecords: 0,
    confidence: undefined,
  }

  const links: ReconciliationLink[] = []

  const state = deriveState(metrics, links)

  return {
    metrics,
    reconciliation,
    links,
    state,
    narrative: buildNarrative(state),
    executiveNarrative: buildExecutiveNarrative(state, metrics),
  }
}
