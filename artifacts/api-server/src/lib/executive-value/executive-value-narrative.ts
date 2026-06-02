import type { ExecutiveValueAggregate, ExecutiveValueNarrative } from './executive-value-types'

const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`

export function buildExecutiveValueNarrative(summary: ExecutiveValueAggregate): ExecutiveValueNarrative {
  const metrics = summary.valueMetrics
  const topDomain = [...summary.byDomain].sort((a, b) => b.verifiedMonthlySavings - a.verifiedMonthlySavings || b.projectedMonthlySavings - a.projectedMonthlySavings)[0]
  const blockerTypes = Array.from(new Set(summary.blockers.map((blocker) => blocker.type.toLowerCase()))).slice(0, 3)
  const headline = `Certen has identified ${money(metrics.projectedMonthlySavings)}/month in potential savings, with ${money(metrics.verifiedMonthlySavings)}/month verified and ${money(metrics.protectedMonthlySavings)}/month protected from drift.`
  const executiveSummary = metrics.verifiedMonthlySavings > 0
    ? `Most verified value currently comes from ${topDomain?.domain ?? 'available outcome proof'} evidence. Broader savings remain projected until approvals, execution, and verification are complete.`
    : `Value is currently primarily projected. Verified savings are unavailable until governed execution and Outcome Proof verification complete.`
  const valueRealizationSummary = `The funnel currently shows ${money(metrics.approvedMonthlySavings)}/month approved, ${money(metrics.executedMonthlySavings)}/month executed, and ${money(metrics.retainedMonthlySavings)}/month retained.`
  const confidenceSummary = `Evidence completeness is ${summary.confidence.evidenceCompletenessPercent}% and outcome confidence is ${summary.confidence.outcomeConfidenceBand}. Trust coverage is ${summary.confidence.trustCoveragePercent}% and connector coverage is ${summary.confidence.connectorCoveragePercent}%.`
  const riskSummary = summary.blockers.length
    ? `Blocked value is concentrated in ${blockerTypes.join(', ')} gaps. Controlled execution should remain limited to validated paths until these blockers are resolved.`
    : `No executive blockers are currently surfaced by the reused authorities. Continue to verify evidence before expanding execution.`
  const nextBestActions = [
    summary.counts.evidencePacksGenerated ? 'Review latest executive evidence pack' : 'Generate evidence pack for verified outcomes',
    summary.confidence.trustCoveragePercent < 75 ? 'Resolve trust coverage blockers' : 'Maintain trust monitoring for active domains',
    summary.counts.approvalsPending > 0 ? 'Review approval backlog' : 'Review next prioritized opportunities',
    summary.counts.driftAlertsOpen > 0 ? 'Investigate open drift alerts' : 'Confirm drift protection rules for verified outcomes',
  ]
  return { headline, executiveSummary, valueRealizationSummary, confidenceSummary, riskSummary, nextBestActions }
}
