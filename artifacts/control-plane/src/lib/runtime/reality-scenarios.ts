import type { DemoScenarioId } from '../demo/scenarios'
import type { RealityEvent } from './reality-events'
export type ScenarioEventTemplate = Omit<RealityEvent,'id'|'timestamp'|'demo'> & { delayMs:number }
export const REALITY_SCENARIO_TIMELINES: Record<DemoScenarioId, ScenarioEventTemplate[]> = {
'openai-token-explosion': [
{ delayMs: 1200, type: 'EXECUTION_MOVED_TO_RUNNING', domain: 'ai', source: 'Execution engine', severity: 'info', message: 'Execution moved to running for OpenAI routing policy.', relatedPath: '/app/execution' },
{ delayMs: 2600, type: 'EXECUTION_MOVED_TO_PENDING_VERIFICATION', domain: 'ai', source: 'Execution engine', severity: 'info', message: 'Execution moved to pending verification.', relatedPath: '/app/execution' },
{ delayMs: 4200, type: 'VERIFICATION_COMPLETED', domain: 'ai', source: 'Verification service', severity: 'success', message: 'Verification completed for OpenAI routing policy.', relatedPath: '/app/intelligence' },],
'm365-disabled-user-reclaim': [
{ delayMs: 1000, type: 'FLEXERA_AUTHORITY_APPLIED', domain: 'saas', source: 'Flexera authority', severity: 'success', message: 'Flexera authority evidence increased confidence on M365 reclaim.', relatedPath: '/app/command' },
{ delayMs: 2600, type: 'EXECUTION_MOVED_TO_PENDING_VERIFICATION', domain: 'saas', source: 'Execution engine', severity: 'info', message: 'M365 reclaim moved to pending verification.', relatedPath: '/app/execution' },
{ delayMs: 4200, type: 'VERIFICATION_COMPLETED', domain: 'saas', source: 'Verification service', severity: 'success', message: 'Connector evidence reconciled and verified for M365 reclaim.', relatedPath: '/app/governance' },],
'aws-connector-degradation': [
{ delayMs: 1200, type: 'CONNECTOR_FRESHNESS_DEGRADED', domain: 'cloud', source: 'Connector health', severity: 'warning', message: 'AWS connector freshness degraded below policy threshold.', relatedPath: '/app/connectors' },
{ delayMs: 2800, type: 'DRIFT_DETECTED', domain: 'cloud', source: 'Drift monitor', severity: 'critical', message: 'Drift detected due to stale cloud evidence.', relatedPath: '/app/governance' },
{ delayMs: 4500, type: 'CONNECTOR_RECOVERED', domain: 'cloud', source: 'Connector health', severity: 'success', message: 'AWS connector recovered after credential refresh.', relatedPath: '/app/connectors' },],
'drift-recurrence': [
{ delayMs: 1000, type: 'DRIFT_RISK_ELEVATED', domain: 'ai', source: 'Drift monitor', severity: 'warning', message: 'Previously optimized workflow shows recurrence risk.', relatedPath: '/app/intelligence' },
{ delayMs: 2600, type: 'FLEXERA_MISMATCH_DETECTED', domain: 'saas', source: 'Flexera authority', severity: 'critical', message: 'Entitlement mismatch detected; recommendation blocked.', relatedPath: '/app/command' },
{ delayMs: 4200, type: 'AUDIT_EVENT_APPENDED', domain: 'ai', source: 'Audit continuity', severity: 'info', message: 'Governance audit updated with drift action-required event.', relatedPath: '/app/governance' },],
'flexera-entitlement-reconciliation': [
{ delayMs: 1000, type: 'FLEXERA_AUTHORITY_APPLIED', domain: 'saas', source: 'Flexera authority', severity: 'success', message: 'Recommendation confidence adjusted from 76% to 91% using Flexera entitlement evidence.', relatedPath: '/app/command' },
{ delayMs: 2600, type: 'FLEXERA_MISMATCH_DETECTED', domain: 'saas', source: 'Flexera authority', severity: 'critical', message: 'Entitlement mismatch detected; recommendation blocked pending reconciliation.', relatedPath: '/app/governance' },
{ delayMs: 4200, type: 'AUDIT_EVENT_APPENDED', domain: 'saas', source: 'Audit continuity', severity: 'info', message: 'Flexera authority evidence applied and recorded in governance audit.', relatedPath: '/app/governance' },
],
}
