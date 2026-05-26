/**
 * Deterministic governed demo runtime.
 * Synthetic evidence only.
 * Never used for LIVE runtime.
 * No production connectors or live mutations are permitted.
 */
import type { CommandViewState } from '../lib/commandViewData'
import { DEMO_BANNER } from '../lib/commandViewData'

export const deterministicDemoCommandState: CommandViewState = {
  globalVerdict: 'DEMO_DATA_ONLY',
  verdictReason: 'Runtime APIs are unavailable; showing deterministic demo control-plane state with synthetic evidence.',
  verdictNextAction: 'Use safe execution simulation only while no production systems are connected.',
  dataMode: { tenantMode: 'DEMO', connectorMode: 'SYNTHETIC', liveExecutionEnabled: false, demoSafetyMessage: DEMO_BANNER },
  summary: { monthlySavingsIdentified: 24800, governedEligibleSavings: 11200, pendingApprovalValue: 6800, verifiedRealizedSavings: 4200, blockedValue: 2100, driftExposure: 900, connectorHealthScore: 74, dataTrustHealth: 70 },
  actionQueue: [
    { id: 'demo-blocked-1', title: 'M365 reclaim cohort with stale identity evidence', domain: 'saas', state: 'BLOCKED', trustScore: 61, riskClass: 'B', approvalState: 'PENDING_DATA', executionMode: 'RECOMMEND_ONLY', projectedMonthlySavings: 2100, projectedAnnualSavings: 25200, nextStep: 'Refresh M365 evidence feed', reason: 'Synthetic evidence indicates identity freshness below policy threshold.', evidenceSummary: 'Synthetic evidence only. No production systems connected.', sourceIds: ['m365', 'servicenow'] },
    { id: 'demo-approval-1', title: 'AWS rightsize recommendation batch', domain: 'cloud', state: 'APPROVAL_REQUIRED', trustScore: 81, riskClass: 'B', approvalState: 'PENDING', executionMode: 'APPROVAL_REQUIRED', projectedMonthlySavings: 6800, projectedAnnualSavings: 81600, nextStep: 'Collect dual approval from FinOps + Eng', reason: 'Risk class B requires approval workflow.', evidenceSummary: 'Synthetic evidence with safe execution simulation only.', sourceIds: ['servicenow', 'flexera'] },
    { id: 'demo-ready-1', title: 'OpenAI model route policy update', domain: 'ai', state: 'READY_TO_EXECUTE', trustScore: 93, riskClass: 'C', approvalState: 'NOT_REQUIRED', executionMode: 'GOVERNANCE_ENFORCED', projectedMonthlySavings: 11200, projectedAnnualSavings: 134400, nextStep: 'Queue governed execution simulation', reason: 'Trust score and rollback coverage satisfy policy in demo simulation.', evidenceSummary: 'Synthetic evidence supports governed readiness. Live execution disabled.', sourceIds: ['flexera', 'm365'] },
  ],
  connectors: [
    { id: 'm365', name: 'M365', mode: 'SYNTHETIC', health: 'DEGRADED', capability: 'READ_ONLY', freshness: '2026-05-01T09:00:00.000Z', trustImpact: 'Trust 72%' },
    { id: 'servicenow', name: 'ServiceNow', mode: 'SYNTHETIC', health: 'BLOCKED', capability: 'NONE', freshness: '2026-05-01T09:00:00.000Z', trustImpact: 'Trust 65%' },
    { id: 'flexera', name: 'Flexera', mode: 'SYNTHETIC', health: 'HEALTHY', capability: 'READ_ONLY', freshness: '2026-05-01T09:00:00.000Z', trustImpact: 'Trust 84%' },
  ],
  driftSignals: [{ id: 'demo-drift-1', title: 'License reclaim recurrence watch', severity: 'MEDIUM', valueAtRisk: 900, status: 'OPEN' }],
}
