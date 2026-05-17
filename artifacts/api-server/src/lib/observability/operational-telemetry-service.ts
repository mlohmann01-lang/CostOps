import { and, desc, eq, gte } from "drizzle-orm";
import { connectorHealthSnapshotsTable, db, governanceActivityStreamTable, operationalEventsTable, operatorActivityEventsTable } from "@workspace/db";

export const FailureTaxonomy = ["CONNECTOR_FAILURE","TRUST_DEGRADATION","RECONCILIATION_FAILURE","GOVERNANCE_BLOCK","SIMULATION_FAILURE","OUTCOME_VALIDATION_FAILURE","GRAPH_INTEGRITY_FAILURE","POLICY_EVALUATION_FAILURE","RATE_LIMIT_EXCEEDED","AUTHORIZATION_FAILURE","DATA_STALENESS"] as const;

export const deriveSlaStatus = (n:number)=> n >= 0.95 ? "HEALTHY" : n >=0.8 ? "WARNING" : "BREACHED";
export const classifyFailure = (eventType: string) => {
  const byType: Record<string,string> = { CONNECTOR_SYNC_FAILED:"CONNECTOR_FAILURE", POLICY_EVALUATION_BLOCKED:"GOVERNANCE_BLOCK", GRAPH_REBUILD_FAILED:"GRAPH_INTEGRITY_FAILURE", REPLAY_VALIDATION_FAILED:"OUTCOME_VALIDATION_FAILURE", RATE_LIMIT_HIT:"RATE_LIMIT_EXCEEDED" };
  return byType[eventType] ?? "RECONCILIATION_FAILURE";
};

export class OperationalTelemetryService {
  async emitEvent(event: any) { return (await db.insert(operationalEventsTable).values(event).returning())[0]; }
  async persistConnectorTelemetry(snapshot: any) { return (await db.insert(connectorHealthSnapshotsTable).values(snapshot).returning())[0]; }
  async persistGovernanceTelemetry(activity: any) { return (await db.insert(governanceActivityStreamTable).values(activity).returning())[0]; }
  async persistOperatorActivity(activity: any) { return (await db.insert(operatorActivityEventsTable).values(activity).returning())[0]; }

  async diagnostics(tenantId: string) {
    const events = await db.select().from(operationalEventsTable).where(eq(operationalEventsTable.tenantId, tenantId)).orderBy(desc(operationalEventsTable.createdAt)).limit(500);
    const buckets = (category: string) => events.filter((e) => e.eventCategory === category).map((e: any) => Number(e.eventMetadata?.latencyMs ?? 0)).filter(Boolean);
    const avg = (nums: number[]) => nums.length ? Math.round(nums.reduce((a,b)=>a+b,0)/nums.length) : 0;
    return {
      connectorSyncLatencyMs: avg(buckets("CONNECTOR_SYNC")), policyEvaluationLatencyMs: avg(buckets("POLICY_EVALUATION")), recommendationGenerationLatencyMs: avg(buckets("RECOMMENDATION_GENERATION")), simulationDurationMs: avg(buckets("SIMULATION")), graphRebuildDurationMs: avg(buckets("GRAPH_REBUILD")), replayValidationFailures: events.filter((e)=>e.eventType==="REPLAY_VALIDATION_FAILED").length, integrityMismatches: events.filter((e)=>e.eventType==="INTEGRITY_MISMATCH").length, trustDegradationSpikes: events.filter((e)=>e.failureCategory==="TRUST_DEGRADATION").length,
    };
  }
  async slas(tenantId: string) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24*60*60*1000);
    const connectors = await db.select().from(connectorHealthSnapshotsTable).where(and(eq(connectorHealthSnapshotsTable.tenantId, tenantId), gte(connectorHealthSnapshotsTable.createdAt, dayAgo))).orderBy(desc(connectorHealthSnapshotsTable.createdAt));

    const recent = connectors.slice(0,20);
    const freshness = recent.length ? recent.reduce((a:any,b:any)=>a+Number(b.freshnessScore),0)/recent.length : 0;
    return { connectorFreshnessSla: { score: freshness, status: deriveSlaStatus(freshness) } };
  }
}

export const operationalTelemetryService = new OperationalTelemetryService();


export type M365TelemetryMetadata = {
  tenantId: string;
  recommendationId?: string;
  workflowId?: string;
  playbookId?: string;
  entityId?: string;
  correlationId?: string;
  traceId?: string;
  trustBand?: string;
  lifecycleState?: string;
  governanceOutcome?: string;
  simulationId?: string;
  outcomeId?: string;
  severity?: string;
  [k: string]: unknown;
};

export async function emitM365Event(eventType: string, metadata: M365TelemetryMetadata) {
  return operationalTelemetryService.emitEvent({
    tenantId: metadata.tenantId,
    eventCategory: 'M365_OPERATIONAL',
    eventType,
    eventStatus: 'SUCCESS',
    failureCategory: null,
    eventMetadata: { ...metadata, eventTimestamp: new Date().toISOString() },
    correlationId: String(metadata.correlationId ?? metadata.traceId ?? `${eventType}:${Date.now()}`),
  });
}




export async function emitAdobeEvent(eventType: string, metadata: M365TelemetryMetadata) {
  return operationalTelemetryService.emitEvent({
    tenantId: metadata.tenantId,
    eventCategory: 'ADOBE_OPERATIONAL',
    eventType,
    eventStatus: 'SUCCESS',
    failureCategory: null,
    eventMetadata: { ...metadata, domain: 'ADOBE', eventTimestamp: new Date().toISOString() },
    correlationId: String(metadata.correlationId ?? metadata.traceId ?? `${eventType}:${Date.now()}`),
  });
}



export async function emitAtlassianEvent(eventType: string, metadata: M365TelemetryMetadata) {
  return operationalTelemetryService.emitEvent({
    tenantId: metadata.tenantId,
    eventCategory: 'ATLASSIAN_OPERATIONAL',
    eventType,
    eventStatus: 'SUCCESS',
    failureCategory: null,
    eventMetadata: { ...metadata, domain: 'ATLASSIAN', eventTimestamp: new Date().toISOString() },
    correlationId: String(metadata.correlationId ?? metadata.traceId ?? `${eventType}:${Date.now()}`),
  });
}

export const REQUIRED_ADOBE_RUNTIME_EVENTS = [
  "ADOBE_EVIDENCE_NORMALIZED",
  "ADOBE_TRUST_DEGRADED",
  "ADOBE_TRUST_QUARANTINED",
  "ADOBE_RECONCILIATION_FINDING_CREATED",
  "ADOBE_RECONCILIATION_BLOCKER_CREATED",
  "ADOBE_RECOMMENDATION_GENERATED",
  "ADOBE_RIGHTSIZE_RECOMMENDATION_GENERATED",
  "ADOBE_ADDON_RECOMMENDATION_GENERATED",
  "ADOBE_STORAGE_REVIEW_RECOMMENDED",
  "ADOBE_RECOMMENDATION_SUPPRESSED",
  "ADOBE_GOVERNANCE_ESCALATED",
  "ADOBE_WORKFLOW_REVIEW_CREATED",
  "ADOBE_GRAPH_CORRELATION_LOW_CONFIDENCE",
  "ADOBE_SIMULATION_CREATED",
  "ADOBE_OUTCOME_RESOLVED",
  "ADOBE_REPLAY_VALIDATED",
  "ADOBE_REPLAY_MISMATCH",
  "ADOBE_RENEWAL_READINESS_COMPUTED",
  "ADOBE_PORTFOLIO_GOVERNANCE_UPDATED",
  "ADOBE_GOVERNANCE_DRIFT_DETECTED",
  "ADOBE_RENEWAL_RISK_ESCALATED",
  "ADOBE_MATURITY_SCORE_UPDATED",
  "ADOBE_EXECUTIVE_REPORT_GENERATED",
  "ADOBE_OUTCOME_CALIBRATION_UPDATED",
 ] as const;

export const REQUIRED_ATLASSIAN_RUNTIME_EVENTS = [
  "ATLASSIAN_EVIDENCE_NORMALIZED",
  "ATLASSIAN_TRUST_DEGRADED",
  "ATLASSIAN_TRUST_QUARANTINED",
  "ATLASSIAN_RECONCILIATION_FINDING_CREATED",
  "ATLASSIAN_RECONCILIATION_BLOCKER_CREATED",
  "ATLASSIAN_RECOMMENDATION_GENERATED",
  "ATLASSIAN_RECOMMENDATION_SUPPRESSED",
  "ATLASSIAN_GOVERNANCE_ESCALATED",
  "ATLASSIAN_WORKFLOW_REVIEW_CREATED",
  "ATLASSIAN_REPLAY_VALIDATED",
  "ATLASSIAN_REPLAY_MISMATCH",
  "ATLASSIAN_MARKETPLACE_REVIEW_CREATED",
  "ATLASSIAN_WORKSPACE_GOVERNANCE_REVIEW_CREATED",
  "ATLASSIAN_PERMISSION_RISK_ESCALATED",
  "ATLASSIAN_ADMIN_RISK_ESCALATED",
  "ATLASSIAN_SIMULATION_CREATED",
  "ATLASSIAN_OUTCOME_RESOLVED",
  "ATLASSIAN_GOVERNANCE_DRIFT_DETECTED",
  "ATLASSIAN_RENEWAL_RISK_ESCALATED",
  "ATLASSIAN_RENEWAL_READINESS_COMPUTED",
  "ATLASSIAN_PORTFOLIO_GOVERNANCE_UPDATED",
  "ATLASSIAN_MATURITY_SCORE_UPDATED",
  "ATLASSIAN_EXECUTIVE_REPORT_GENERATED",
  "ATLASSIAN_OUTCOME_CALIBRATION_UPDATED",
  "CROSS_DOMAIN_IDENTITY_EXPOSURE_DETECTED",
  "CROSS_DOMAIN_OVERLAP_DETECTED",
  "CROSS_DOMAIN_ADMIN_EXPOSURE_DETECTED",
  "CROSS_DOMAIN_PORTFOLIO_GOVERNANCE_COMPUTED",
  "CROSS_DOMAIN_WORKFLOW_PRESSURE_COMPUTED",
  "CROSS_DOMAIN_GOVERNANCE_DRIFT_DETECTED",
  "CROSS_DOMAIN_WORKFLOW_PRESSURE_ESCALATED",
  "CROSS_DOMAIN_MATURITY_SCORE_COMPUTED",
  "CROSS_DOMAIN_REPLAY_VALIDATED",
  "CROSS_DOMAIN_REPLAY_MISMATCH",
  "RUNTIME_HARDENING_IDENTITY_RECONCILIATION_EVALUATED",
  "RUNTIME_HARDENING_TRUST_DEGRADATION_MODELED",
  "RUNTIME_HARDENING_WORKFLOW_SURVIVABILITY_EVALUATED",
  "RUNTIME_HARDENING_REPLAY_DURABILITY_EVALUATED",
  "RUNTIME_HARDENING_TELEMETRY_PRESSURE_EVALUATED",
  "RUNTIME_HARDENING_DRIFT_REALISM_EVALUATED",
  "RUNTIME_HARDENING_OUTCOME_REALISM_EVALUATED",
  "RUNTIME_HARDENING_DIAGNOSTICS_EMITTED",
  "RUNTIME_HARDENING_CHAOS_SIMULATED",
] as const;
export const REQUIRED_M365_RUNTIME_EVENTS = [
  "M365_TRUST_DEGRADED",
  "M365_TRUST_QUARANTINED",
  "M365_RECONCILIATION_FINDING_CREATED",
  "M365_RECONCILIATION_BLOCKER_CREATED",
  "M365_RECOMMENDATION_GENERATED",
  "M365_RECOMMENDATION_DOWNGRADED",
  "M365_RECOMMENDATION_SUPPRESSED",
  "M365_LIFECYCLE_TRANSITION",
  "M365_GOVERNANCE_ESCALATED",
  "M365_ARBITRATION_COMPLETED",
  "M365_ARBITRATION_CONFLICT_SUPPRESSED",
  "M365_WORKFLOW_REVIEW_CREATED",
  "M365_WORKFLOW_ESCALATED",
  "M365_WORKFLOW_SLA_BREACHED",
  "M365_SIMULATION_CREATED",
  "M365_SIMULATION_GATED",
  "M365_OUTCOME_RESOLVED",
  "M365_OUTCOME_DRIFT_DETECTED",
  "M365_OUTCOME_REVERSED",
  "M365_REPLAY_VALIDATED",
  "M365_REPLAY_MISMATCH",
] as const;

export function computeTelemetryCoverage(events: Array<{ eventType: string; correlationId?: string | null; eventMetadata?: any }>) {
  const seen = new Set(events.map((e) => String(e.eventType)));
  const missing = REQUIRED_M365_RUNTIME_EVENTS.filter((e) => !seen.has(e));
  const missingCorrelation = events.filter((e) => !e.correlationId).length;
  const missingTrace = events.filter((e) => !e.eventMetadata?.traceId).length;
  const coveragePercent = Math.round(((REQUIRED_M365_RUNTIME_EVENTS.length - missing.length) / REQUIRED_M365_RUNTIME_EVENTS.length) * 100);
  return { coveragePercent, missingEvents: missing, missingCorrelationCount: missingCorrelation, missingTraceCount: missingTrace };
}
