import { db, executionApprovalsTable, executionRequestDryRunsTable, recommendationsTable, connectorSyncStatusTable, executionRequestsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { evaluateAndPersistPolicy } from './policy-engine';

export async function runGovernanceChecks(tenantId: string, triggeredBy = 'SCHEDULER') {
  const [approvals, dryRuns, recs, connectors, reqs] = await Promise.all([
    db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.tenantId, tenantId)),
    db.select().from(executionRequestDryRunsTable).where(eq(executionRequestDryRunsTable.tenantId, tenantId)),
    db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId)),
    db.select().from(connectorSyncStatusTable).where(eq(connectorSyncStatusTable.tenantId, tenantId)),
    db.select().from(executionRequestsTable).where(eq(executionRequestsTable.tenantId, tenantId)),
  ]);
  const evaluations = [] as any[];
  for (const a of approvals) evaluations.push(await evaluateAndPersistPolicy({ tenantId, entityType: 'APPROVAL', entityId: String(a.id), policyName: 'APPROVAL_EXPIRES_AFTER_X_HOURS', entity: a, triggeredBy }));
  for (const d of dryRuns) evaluations.push(await evaluateAndPersistPolicy({ tenantId, entityType: 'DRY_RUN', entityId: d.executionRequestId, policyName: 'DRY_RUN_EXPIRES_AFTER_X_HOURS', entity: d, triggeredBy }));
  for (const c of connectors) evaluations.push(await evaluateAndPersistPolicy({ tenantId, entityType: 'CONNECTOR', entityId: c.connector, policyName: 'CONNECTOR_MUST_REMAIN_HEALTHY', entity: c, triggeredBy }));
  for (const r of recs) evaluations.push(await evaluateAndPersistPolicy({ tenantId, entityType: 'RECOMMENDATION', entityId: String(r.id), policyName: 'TRUSTED_LIFECYCLE_REQUIRED_CONTINUOUSLY', entity: r, triggeredBy }));
  for (const e of reqs) evaluations.push(await evaluateAndPersistPolicy({ tenantId, entityType: 'EXECUTION_REQUEST', entityId: e.executionRequestId, policyName: 'AUTO_EXECUTE_SAFE_GLOBALLY_DISABLED', entity: e, triggeredBy }));
  return { tenantId, evaluationsCount: evaluations.length, evaluations };
}
