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
