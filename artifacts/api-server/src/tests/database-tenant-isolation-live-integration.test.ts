// Program 14A-C — Tenant Isolation Closure.
//
// Unlike database-tenant-isolation-authority.test.ts (which proves cross-
// tenant denial against in-memory-equivalent logic), this file proves it
// against REAL Postgres-backed Drizzle queries, closing the
// cross-tenant-test-coverage gap. It requires DATABASE_URL and is gated
// by the standard RUN_DB_INTEGRATION_TESTS=true convention (see
// scripts/run-pattern-tests.mjs); it is registered in that file's
// dbIntegrationTests Set so it is skipped by default and only runs when
// a real database is provisioned.
import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { db, outcomeLedgerTable, auditEventsTable } from "@workspace/db";
import { DatabasePersistenceStore } from "../lib/evidence-registry/evidence-registry-persistence";
import { recordAuditEvent } from "../lib/audit/audit-service";

const TENANT_A = "14a-c-tenant-a";
const TENANT_B = "14a-c-tenant-b";

test("[Program 14A-C][live DB] evidence-registry DatabasePersistenceStore: tenant A cannot list/get/overwrite/delete tenant B's rows", async () => {
  const store = new DatabasePersistenceStore<{ id: string; tenantId: string; value: number }>("EVIDENCE_REGISTRY_RECORDS");
  const recordId = `14a-c-${Date.now()}`;
  await store.upsert({ id: recordId, tenantId: TENANT_A, value: 1 });
  await store.upsert({ id: recordId, tenantId: TENANT_B, value: 2 });

  // Scenario 1 — list: tenant A only ever sees tenant A's rows.
  const aList = await store.list(TENANT_A);
  assert.ok(aList.every((r) => r.tenantId === TENANT_A));
  assert.ok(aList.some((r) => r.id === recordId && r.value === 1));
  assert.ok(!aList.some((r) => r.value === 2), "tenant A's list must never contain tenant B's row");

  // Scenario 2 — read: same record id under a different tenant is a distinct row, not a leak.
  const aGet = await store.get(TENANT_A, recordId);
  const bGet = await store.get(TENANT_B, recordId);
  assert.equal(aGet?.value, 1);
  assert.equal(bGet?.value, 2);

  // Scenario 3 — "update": tenant A re-upserting the same id never touches tenant B's row,
  // because the live SQL primary key is tenantId+collection+id, not id alone.
  await store.upsert({ id: recordId, tenantId: TENANT_A, value: 99 });
  assert.equal((await store.get(TENANT_A, recordId))?.value, 99);
  assert.equal((await store.get(TENANT_B, recordId))?.value, 2, "tenant A's update must not have mutated tenant B's row");

  // Scenario 4 — delete: deleteTenant(A) never removes tenant B's row.
  await store.deleteTenant(TENANT_A);
  assert.equal(await store.get(TENANT_A, recordId), undefined);
  assert.equal((await store.get(TENANT_B, recordId))?.value, 2, "deleteTenant(A) must not delete tenant B's row");

  await store.deleteTenant(TENANT_B);
});

test("[Program 14A-C][live DB] outcomeLedgerTable: tenant-scoped reads against a real Postgres connection never cross tenants", async () => {
  const base = {
    recommendationId: 1,
    userEmail: "u@example.com",
    displayName: "Test User",
    action: "REMOVE_LICENSE",
    licenceSku: "E5",
    monthlySaving: 10,
    annualisedSaving: 120,
  };
  const [rowA] = await db.insert(outcomeLedgerTable).values({ ...base, tenantId: TENANT_A }).returning();
  const [rowB] = await db.insert(outcomeLedgerTable).values({ ...base, tenantId: TENANT_B }).returning();

  // Mirrors the real tenant-scoped read pattern used by outcome-proof-service.ts /
  // job-registry.ts / m365-beta-drift.ts: filter by eq(outcomeLedgerTable.tenantId, t).
  const aRows = await db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.tenantId, TENANT_A));
  const bRows = await db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.tenantId, TENANT_B));

  assert.ok(aRows.some((r) => r.id === rowA.id));
  assert.ok(!aRows.some((r) => r.id === rowB.id), "tenant A's filtered read must never include tenant B's ledger row");
  assert.ok(bRows.some((r) => r.id === rowB.id));
  assert.ok(!bRows.some((r) => r.id === rowA.id), "tenant B's filtered read must never include tenant A's ledger row");

  // Scenario 2 — "read tenant B's row by id while scoped to tenant A": not found.
  const crossTenantLookup = await db
    .select()
    .from(outcomeLedgerTable)
    .where(and(eq(outcomeLedgerTable.id, rowB.id), eq(outcomeLedgerTable.tenantId, TENANT_A)));
  assert.equal(crossTenantLookup.length, 0, "looking up tenant B's row id while scoped to tenant A must return nothing");
});

test("[Program 14A-C][live DB] auditEventsTable: writes are tenant-stamped and a tenant-scoped filter genuinely separates tenants at the row level", async () => {
  // No application-level reader of auditEventsTable exists anywhere in this
  // codebase today (see Program 14A-C investigation) — recordAuditEvent only
  // writes. This test proves the write path stamps the correct tenantId and
  // that filtering by tenantId at the row level is sufficient to separate
  // tenants in the live table, which is the necessary precondition for any
  // future reader to be tenant-safe. It deliberately does NOT claim a
  // verified application-level read path, because none exists yet.
  const requestId = `14a-c-${Date.now()}`;
  await recordAuditEvent({ tenantId: TENANT_A, actorId: "actor-a", actorRole: "ADMIN", eventType: "AUTH_LOGIN", resourceType: "session", requestId });
  await recordAuditEvent({ tenantId: TENANT_B, actorId: "actor-b", actorRole: "ADMIN", eventType: "AUTH_LOGIN", resourceType: "session", requestId });

  const aEvents = await db.select().from(auditEventsTable).where(and(eq(auditEventsTable.requestId, requestId), eq(auditEventsTable.tenantId, TENANT_A)));
  const bEvents = await db.select().from(auditEventsTable).where(and(eq(auditEventsTable.requestId, requestId), eq(auditEventsTable.tenantId, TENANT_B)));

  assert.equal(aEvents.length, 1);
  assert.equal(aEvents[0].actorId, "actor-a");
  assert.equal(bEvents.length, 1);
  assert.equal(bEvents[0].actorId, "actor-b");
  assert.ok(!aEvents.some((e) => e.actorId === "actor-b"), "tenant A's filtered audit read must never include tenant B's event");
});
