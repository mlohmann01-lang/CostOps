import { db, connectorSyncStatusTable, m365UsersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { getGraphAccessToken } from "../connectors/m365/m365-graph-client";

export async function removeUserLicense(input: { tenantId: string; userPrincipalName: string; skuId: string; actorId?: string; dryRun: boolean; action: string }) {
  if (input.action !== "REMOVE_LICENSE") {
    return { ok: false, error: "UNSUPPORTED_ACTION", mutationPerformed: false };
  }

  const [user] = await db
    .select()
    .from(m365UsersTable)
    .where(and(eq(m365UsersTable.tenantId, input.tenantId), eq(m365UsersTable.userPrincipalName, input.userPrincipalName)))
    .limit(1);

  if (!user) return { ok: false, error: "USER_NOT_FOUND_IN_CANONICAL_STATE", mutationPerformed: false };
  if (!(user.assignedLicenses ?? []).includes(input.skuId)) {
    return { ok: false, error: "LICENSE_NOT_FOUND_IN_CANONICAL_STATE", mutationPerformed: false };
  }

  const [sync] = await db.select().from(connectorSyncStatusTable).where(eq(connectorSyncStatusTable.tenantId, input.tenantId)).orderBy(desc(connectorSyncStatusTable.createdAt)).limit(1);
  if (!sync || sync.connectorHealth === "FAILED") {
    return { ok: false, error: "CONNECTOR_HEALTH_FAILED", mutationPerformed: false };
  }

  const before = { assignedLicenses: user.assignedLicenses, hasLicense: true };
  const after = { assignedLicenses: (user.assignedLicenses ?? []).filter((s) => s !== input.skuId), hasLicense: false };
  const rollbackPayload = { action: "ASSIGN_LICENSE", userPrincipalName: input.userPrincipalName, skuId: input.skuId };

  if (input.dryRun) {
    return { ok: true, mutationPerformed: false, dryRun: true, before, after, rollbackPayload, requestId: undefined };
  }

  const token = await getGraphAccessToken();
  if (!token.accessToken) return { ok: false, error: token.error ?? "GRAPH_TOKEN_ERROR", mutationPerformed: false };

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(input.userPrincipalName)}/assignLicense`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ addLicenses: [], removeLicenses: [input.skuId] }),
  });

  const requestId = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") ?? token.requestId;
  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: "GRAPH_ASSIGN_LICENSE_FAILED", details: body, mutationPerformed: false, requestId };
  }

  return { ok: true, mutationPerformed: true, dryRun: false, before, after, rollbackPayload, requestId, actorId: input.actorId ?? "" };
}
