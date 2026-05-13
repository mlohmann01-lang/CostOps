import { db, m365UsersTable, outcomeLedgerTable, rollbackEventsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { canExecute } from "../governance/authorization";
import { getGraphAccessToken } from "../connectors/m365/m365-graph-client";

export async function rollbackOutcome(input: { outcomeLedgerId: string; actorId?: string; tenantId: string; dryRun: boolean }) {
  const [outcome] = await db.select().from(outcomeLedgerTable).where(and(eq(outcomeLedgerTable.id, Number(input.outcomeLedgerId)), eq(outcomeLedgerTable.tenantId, input.tenantId))).limit(1);
  if (!outcome) return { allowed: false, error: "OUTCOME_NOT_FOUND" };

  const rollbackPayload = (outcome.executionEvidence as any)?.rollbackPayload;
  if (!rollbackPayload) return { allowed: false, error: "ROLLBACK_PAYLOAD_MISSING" };
  if (rollbackPayload.action !== "ASSIGN_LICENSE") return { allowed: false, error: "ROLLBACK_ACTION_UNSUPPORTED" };

  const auth = canExecute(input.actorId, input.tenantId, { actionRiskProfile: outcome.actionRiskProfile });
  if (!auth.allowed) return { allowed: false, error: `AUTHORIZATION_${auth.reason}` };

  const [dup] = await db.select().from(rollbackEventsTable).where(eq(rollbackEventsTable.idempotencyKey, `rollback:outcome:${outcome.id}:action:${rollbackPayload.action}`)).limit(1);
  if (dup) return { allowed: false, error: "DUPLICATE_ROLLBACK", status: 409, existing: dup };

  const [user] = await db.select().from(m365UsersTable).where(and(eq(m365UsersTable.tenantId, input.tenantId), eq(m365UsersTable.userPrincipalName, rollbackPayload.userPrincipalName))).limit(1);
  if (!user) return { allowed: false, error: "USER_NOT_FOUND_IN_CANONICAL_STATE" };

  const before = { assignedLicenses: user.assignedLicenses ?? [] };
  const after = { assignedLicenses: [...new Set([...(user.assignedLicenses ?? []), rollbackPayload.skuId])] };

  const liveEnabled = process.env.ENABLE_LIVE_M365_EXECUTION === "true";
  if (!liveEnabled) return { allowed: false, error: "LIVE_EXECUTION_DISABLED" };

  if (input.dryRun) return { allowed: true, executed: false, beforeState: before, afterState: after, executionMode: "LIVE_GRAPH", mutationPerformed: false };

  const token = await getGraphAccessToken();
  if (!token.accessToken) return { allowed: false, error: token.error ?? "GRAPH_TOKEN_ERROR" };

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(rollbackPayload.userPrincipalName)}/assignLicense`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ addLicenses: [{ skuId: rollbackPayload.skuId }], removeLicenses: [] }),
  });
  const requestId = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") ?? token.requestId ?? "";
  if (!response.ok) return { allowed: false, error: "GRAPH_ASSIGN_LICENSE_FAILED", graphRequestId: requestId };

  const idempotencyKey = `rollback:outcome:${outcome.id}:action:${rollbackPayload.action}`;
  const [event] = await db.insert(rollbackEventsTable).values({
    tenantId: input.tenantId,
    originalOutcomeLedgerId: String(outcome.id),
    recommendationId: outcome.recommendationId,
    rollbackAction: rollbackPayload.action,
    actorId: input.actorId ?? "",
    status: "EXECUTED",
    idempotencyKey,
    beforeState: before,
    afterState: after,
    evidence: { rollbackPayload, authorization: auth },
    executionMode: "LIVE_GRAPH",
    graphRequestId: requestId,
  }).returning();

  return { allowed: true, executed: true, rollbackEvent: event, beforeState: before, afterState: after, graphRequestId: requestId, executionMode: "LIVE_GRAPH" };
}
