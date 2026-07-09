// Program 14B-R — Remediation 2 live-DB regression suite: Audit Tamper
// Evidence wired into the real Postgres-backed write paths.
//
// Requires DATABASE_URL and is gated by the standard RUN_DB_INTEGRATION_TESTS
// convention (see scripts/run-pattern-tests.mjs); it is registered in that
// file's dbIntegrationTests Set so it is skipped by default and only runs
// when a real database is provisioned, following the same pattern as
// database-tenant-isolation-live-integration.test.ts.

import test from "node:test";
import assert from "node:assert/strict";
import { eq, asc } from "drizzle-orm";
import { db, auditEventsTable, executionApprovalsTable } from "@workspace/db";
import { recordAuditEvent } from "../lib/audit/audit-service";
import { ExecutionApprovalService } from "../lib/governance/execution-approval-service";
import { auditHash } from "../lib/security/audit-integrity";

const TENANT = `14b-r-audit-${Date.now()}`;

test("[Program 14B-R / Scenario 1 - audit, live DB] every recorded audit event gets a non-empty tamperHash", async () => {
  await recordAuditEvent({ tenantId: TENANT, actorId: "u1", actorRole: "OPERATOR", eventType: "AUTH_LOGIN", resourceType: "session" });
  const rows = await db.select().from(auditEventsTable).where(eq(auditEventsTable.tenantId, TENANT)).orderBy(asc(auditEventsTable.id));
  assert.equal(rows.length, 1);
  assert.ok(rows[0].tamperHash.length === 64, "a real audit write must produce a sha256 tamperHash");
});

test("[Program 14B-R / audit, live DB] the chain is verifiable: each row's prevHash matches the prior row's tamperHash, and recomputing the hash from stored fields matches what was stored", async () => {
  await recordAuditEvent({ tenantId: TENANT, actorId: "u2", actorRole: "OPERATOR", eventType: "EXECUTION_REQUESTED", resourceType: "execution_request", resourceId: "er-1" });
  const rows = await db.select().from(auditEventsTable).where(eq(auditEventsTable.tenantId, TENANT)).orderBy(asc(auditEventsTable.id));
  assert.ok(rows.length >= 2);
  for (let i = 1; i < rows.length; i++) {
    assert.equal(rows[i].prevHash, rows[i - 1].tamperHash, "each row's prevHash must chain to the previous row's tamperHash");
  }
  const last = rows[rows.length - 1];
  const recomputed = auditHash(last.prevHash, {
    tenantId: last.tenantId,
    actorId: last.actorId,
    actorRole: last.actorRole,
    eventType: last.eventType,
    resourceType: last.resourceType,
    resourceId: last.resourceId ?? null,
    payload: last.payload,
    outcome: last.outcome,
  });
  assert.equal(recomputed, last.tamperHash, "recomputing the hash from the stored deterministic fields must match the stored tamperHash");
});

test("[Program 14B-R / Scenario 2 - audit, live DB] a row mutated outside the write path no longer matches its tamperHash", async () => {
  const rows = await db.select().from(auditEventsTable).where(eq(auditEventsTable.tenantId, TENANT)).orderBy(asc(auditEventsTable.id));
  const target = rows[0];
  await db.update(auditEventsTable).set({ actorId: "attacker" }).where(eq(auditEventsTable.id, target.id));
  const [mutated] = await db.select().from(auditEventsTable).where(eq(auditEventsTable.id, target.id));
  const recomputed = auditHash(mutated.prevHash, {
    tenantId: mutated.tenantId,
    actorId: mutated.actorId,
    actorRole: mutated.actorRole,
    eventType: mutated.eventType,
    resourceType: mutated.resourceType,
    resourceId: mutated.resourceId ?? null,
    payload: mutated.payload,
    outcome: mutated.outcome,
  });
  assert.notEqual(recomputed, mutated.tamperHash, "tampering with a row's fields must invalidate its tamperHash against the stored hash");
});

test("[Program 14B-R / approval tamper hash, live DB] requestApproval/approve/reject persist a tamperHash that changes on each transition", async () => {
  const svc = new ExecutionApprovalService();
  const requested = await svc.requestApproval({ tenantId: TENANT, entityType: "execution_request", entityId: "er-live-1", approvalType: "STANDARD", requiredApprovals: 1, requestedBy: "u1" });
  assert.ok(requested.tamperHash.length === 64, "requestApproval must persist a tamperHash");

  const approved = await svc.approve(requested.id, "u2");
  assert.notEqual(approved.tamperHash, requested.tamperHash, "approving must change the tamperHash");
  assert.ok(svc.verifyTamperHash(approved as any), "the stored row must verify against its own tamperHash immediately after approval");

  const [tampered] = await db.update(executionApprovalsTable).set({ approvalStatus: "REJECTED" }).where(eq(executionApprovalsTable.id, requested.id)).returning();
  assert.ok(!svc.verifyTamperHash(tampered as any), "a status flip made outside approve()/reject() must fail tamperHash verification");
});
