import { m365HealthService } from '../connectors/m365/m365-health'
import { m365TrustService } from '../connectors/m365/m365-trust'
import { monitoredOutcomeService } from '../drift/monitored-outcome-service'
import { platformEventService } from '../events/platform-event-service'
import { evidencePackService } from '../evidence-pack/evidence-pack-service'
import { OpportunityRepository } from '../opportunities/opportunity-repository'
import { outcomeProofService } from '../outcomes/outcome-proof-service'
import type { OutcomeConfidenceBand, OutcomeProof, OutcomeProofSummary } from '../outcomes/outcome-proof-types'
import { ExecutivePriorityRepository } from '../prioritization/executive-priority-repository'
import type { ExecutiveValueAggregate, ExecutiveValueConfidenceBand, ExecutiveValueMetricSourceDetail, ExecutiveValueMetricSources, ExecutiveValueMetrics } from './executive-value-types'

const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0
const source = (source: ExecutiveValueMetricSourceDetail['source'], reason: string): ExecutiveValueMetricSourceDetail => ({ source, reason })
const unknownProofSummary = (tenantId: string): OutcomeProofSummary => ({ tenantId, projectedMonthlySavings: 0, approvedMonthlySavings: 0, executedMonthlySavings: 0, verifiedMonthlySavings: 0, retainedMonthlySavings: 0, protectedMonthlySavings: 0, projectedAnnualSavings: 0, approvedAnnualSavings: 0, executedAnnualSavings: 0, verifiedAnnualSavings: 0, retainedAnnualSavings: 0, protectedAnnualSavings: 0, verificationBacklogCount: 0, verificationFailedCount: 0, driftedOutcomeCount: 0, averageConfidenceBand: 'LOW', generatedAt: new Date().toISOString() })
const band = (value?: OutcomeConfidenceBand): ExecutiveValueConfidenceBand => value === 'HIGH' || value === 'MEDIUM' || value === 'LOW' ? value : value === 'FAILED' ? 'LOW' : 'UNKNOWN'

export async function aggregateExecutiveValue(tenantId: string): Promise<ExecutiveValueAggregate> {
  const opportunities = new OpportunityRepository()
  const priorities = new ExecutivePriorityRepository()
  const opportunityRows = opportunities.list(tenantId)
  const opportunitySummary = opportunities.summary(tenantId)
  const proofSummary = await outcomeProofService.getSummary(tenantId).catch(() => unknownProofSummary(tenantId))
  const proofs = await outcomeProofService.listProofs(tenantId, { limit: 500 }).catch(() => [] as OutcomeProof[])
  const evidencePacks = evidencePackService.list(tenantId)
  const trust = await m365TrustService.generateTrustReport(tenantId).catch(() => null)
  const health = await m365HealthService.getHealth(tenantId).catch(() => null)
  const events = await platformEventService.listEvents(tenantId, { limit: 1000 }).catch(() => [])
  const drift = monitoredOutcomeService.list(tenantId).filter((row) => row.monitoringState === 'DRIFT_DETECTED')
  const priorityRows = priorities.listTopPriorities(tenantId, 5)

  const projectedFromProof = proofSummary.projectedMonthlySavings > 0
  const projectedMonthlySavings = projectedFromProof ? proofSummary.projectedMonthlySavings : opportunitySummary.projectedSavings
  const projectedAnnualSavings = projectedFromProof ? proofSummary.projectedAnnualSavings : projectedMonthlySavings * 12
  const valueMetrics: ExecutiveValueMetrics = {
    projectedMonthlySavings,
    approvedMonthlySavings: proofSummary.approvedMonthlySavings,
    executedMonthlySavings: proofSummary.executedMonthlySavings,
    verifiedMonthlySavings: proofSummary.verifiedMonthlySavings,
    retainedMonthlySavings: proofSummary.retainedMonthlySavings,
    protectedMonthlySavings: proofSummary.protectedMonthlySavings,
    projectedAnnualSavings,
    approvedAnnualSavings: proofSummary.approvedAnnualSavings,
    executedAnnualSavings: proofSummary.executedAnnualSavings,
    verifiedAnnualSavings: proofSummary.verifiedAnnualSavings,
    retainedAnnualSavings: proofSummary.retainedAnnualSavings,
    protectedAnnualSavings: proofSummary.protectedAnnualSavings,
  }
  const metricSources = metricSourcesFor(valueMetrics, projectedFromProof)
  const proofEvidenceSlots = proofs.flatMap((proof) => Object.values(proof.evidenceSummary ?? {}))
  const derivedEvidenceCompleteness = proofEvidenceSlots.length ? pct(proofEvidenceSlots.filter(Boolean).length, proofEvidenceSlots.length) : 0
  const evidenceCompletenessPercent = evidencePacks.length ? Math.round(evidencePacks.reduce((sum, pack) => sum + (pack.metrics?.completeness ?? 0), 0) / evidencePacks.length) : derivedEvidenceCompleteness
  const executionCompletedEvents = events.filter((event: any) => event.category === 'EXECUTION' && /COMPLETED|EXECUTED|VERIFIED/.test(String(event.type))).length
  const approvalEvents = events.filter((event: any) => event.category === 'APPROVAL' && /APPROVED|PENDING|SUBMITTED/.test(String(event.type))).length
  const executionsCompleted = Math.max(executionCompletedEvents, proofs.filter((proof) => proof.executedMonthlySavings > 0 || proof.proofState === 'EXECUTED' || proof.proofState === 'VERIFIED').length)
  const counts = {
    openOpportunities: opportunitySummary.openOpportunities,
    priorityOpportunities: priorityRows.length,
    approvalsPending: opportunitySummary.approvalPending,
    executionsCompleted,
    outcomesVerified: proofs.filter((proof) => proof.verifiedMonthlySavings > 0 || proof.proofState === 'VERIFIED').length,
    driftAlertsOpen: Math.max(drift.length, proofSummary.driftedOutcomeCount),
    evidencePacksGenerated: evidencePacks.length,
  }
  const byDomain = buildByDomain(opportunityRows, proofs, band(proofSummary.averageConfidenceBand))
  const topValueDrivers = opportunityRows.slice().sort((a, b) => b.projectedMonthlySavings - a.projectedMonthlySavings).slice(0, 5).map((opportunity) => ({ id: opportunity.id, title: opportunity.title, source: opportunity.source, domain: opportunity.domain, projectedMonthlySavings: opportunity.projectedMonthlySavings, verifiedMonthlySavings: proofs.find((proof) => proof.opportunityId === opportunity.id)?.verifiedMonthlySavings ?? 0, status: opportunity.status, evidencePackId: evidencePacks[0]?.evidencePackId }))
  const confidence = {
    evidenceCompletenessPercent,
    outcomeConfidenceBand: proofs.length ? band(proofSummary.averageConfidenceBand) : 'UNKNOWN' as const,
    trustCoveragePercent: trust?.globalTrustScore ?? 0,
    connectorCoveragePercent: health?.state === 'HEALTHY' ? 100 : health?.state === 'DEGRADED' ? 65 : health?.state === 'FAILED' || health?.state === 'NOT_CONFIGURED' ? 0 : 40,
    executionCoveragePercent: pct(counts.executionsCompleted, Math.max(counts.executionsCompleted + counts.approvalsPending, approvalEvents, 1)),
  }
  const blockers = [
    ...(trust?.blockers ?? []).map((reason, index) => ({ id: `trust-${index}`, title: 'Trust coverage blocker', type: 'TRUST' as const, blockedValue: projectedMonthlySavings, reason, recommendedAction: 'Resolve trust blockers before expanding execution.' })),
    ...(counts.approvalsPending > 0 ? [{ id: 'approval-backlog', title: 'Approval backlog', type: 'APPROVAL' as const, blockedValue: valueMetrics.approvedMonthlySavings || projectedMonthlySavings, reason: `${counts.approvalsPending} opportunities are waiting on approval.`, recommendedAction: 'Review approval backlog with accountable owners.' }] : []),
    ...(confidence.evidenceCompletenessPercent < 50 ? [{ id: 'evidence-coverage', title: 'Evidence coverage below board threshold', type: 'EVIDENCE' as const, blockedValue: projectedMonthlySavings, reason: 'Evidence Pack Authority coverage is low or unavailable.', recommendedAction: 'Generate an evidence pack and remediate missing evidence sections.' }] : []),
    ...(confidence.connectorCoveragePercent < 75 ? [{ id: 'connector-coverage', title: 'Connector coverage degraded', type: 'CONNECTOR' as const, blockedValue: projectedMonthlySavings, reason: `Connector coverage is ${confidence.connectorCoveragePercent}%.`, recommendedAction: 'Restore connector health before relying on live metrics.' }] : []),
    ...(counts.driftAlertsOpen > 0 ? [{ id: 'open-drift', title: 'Open drift alerts', type: 'DRIFT' as const, blockedValue: valueMetrics.protectedMonthlySavings, reason: `${counts.driftAlertsOpen} drift alerts are open.`, recommendedAction: 'Review drift alerts and confirm protected savings remain retained.' }] : []),
  ]
  return { tenantId, generatedAt: new Date().toISOString(), valueMetrics, metricSources, conversionRates: { approvedVsProjectedPercent: pct(valueMetrics.approvedMonthlySavings, valueMetrics.projectedMonthlySavings), executedVsApprovedPercent: pct(valueMetrics.executedMonthlySavings, valueMetrics.approvedMonthlySavings), verifiedVsExecutedPercent: pct(valueMetrics.verifiedMonthlySavings, valueMetrics.executedMonthlySavings), retainedVsVerifiedPercent: pct(valueMetrics.retainedMonthlySavings, valueMetrics.verifiedMonthlySavings), protectedVsVerifiedPercent: pct(valueMetrics.protectedMonthlySavings, valueMetrics.verifiedMonthlySavings) }, confidence, counts, byDomain, topValueDrivers, blockers }
}

function metricSourcesFor(metrics: ExecutiveValueMetrics, projectedFromProof: boolean): ExecutiveValueMetricSources {
  const projected = projectedFromProof ? source('OUTCOME_PROOF', 'Projected savings sourced from Outcome Proof Authority.') : metrics.projectedMonthlySavings > 0 ? source('OPPORTUNITY_FALLBACK', 'Outcome Proof projected savings unavailable; using Opportunity Authority projected savings fallback.') : source('UNAVAILABLE', 'No projected savings source is currently available.')
  const proof = (monthly: number, label: string) => monthly > 0 ? source('OUTCOME_PROOF', `${label} savings sourced from Outcome Proof Authority.`) : source('UNAVAILABLE', `${label} savings are unavailable until Outcome Proof Authority records them.`)
  return {
    projectedMonthlySavings: projected,
    projectedAnnualSavings: projected,
    approvedMonthlySavings: proof(metrics.approvedMonthlySavings, 'Approved'),
    approvedAnnualSavings: proof(metrics.approvedMonthlySavings, 'Approved'),
    executedMonthlySavings: proof(metrics.executedMonthlySavings, 'Executed'),
    executedAnnualSavings: proof(metrics.executedMonthlySavings, 'Executed'),
    verifiedMonthlySavings: proof(metrics.verifiedMonthlySavings, 'Verified'),
    verifiedAnnualSavings: proof(metrics.verifiedMonthlySavings, 'Verified'),
    retainedMonthlySavings: proof(metrics.retainedMonthlySavings, 'Retained'),
    retainedAnnualSavings: proof(metrics.retainedMonthlySavings, 'Retained'),
    protectedMonthlySavings: proof(metrics.protectedMonthlySavings, 'Protected'),
    protectedAnnualSavings: proof(metrics.protectedMonthlySavings, 'Protected'),
  }
}

function buildByDomain(opportunities: Array<{ domain: string; projectedMonthlySavings: number }>, proofs: OutcomeProof[], defaultBand: ExecutiveValueConfidenceBand) {
  const domains = new Map<string, { domain: string; projectedMonthlySavings: number; verifiedMonthlySavings: number; protectedMonthlySavings: number; confidenceBand: ExecutiveValueConfidenceBand }>()
  const row = (domain: string) => domains.get(domain) ?? { domain, projectedMonthlySavings: 0, verifiedMonthlySavings: 0, protectedMonthlySavings: 0, confidenceBand: defaultBand }
  for (const opportunity of opportunities) { const current = row(opportunity.domain); current.projectedMonthlySavings += opportunity.projectedMonthlySavings; domains.set(current.domain, current) }
  for (const proof of proofs) { const domain = proof.domain ?? 'UNKNOWN'; const current = row(domain); current.verifiedMonthlySavings += proof.verifiedMonthlySavings; current.protectedMonthlySavings += proof.protectedMonthlySavings; current.confidenceBand = band(proof.confidenceBand); domains.set(domain, current) }
  return Array.from(domains.values()).sort((a, b) => b.projectedMonthlySavings - a.projectedMonthlySavings)
}
