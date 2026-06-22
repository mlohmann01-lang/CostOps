// Program 14A — Database Tenant Isolation Verification Authority test suite
// (api-server mirror).
//
// Per the "honest data bias" constraint, these tests both (a) guard the
// authority model's own honesty — no domain claims VERIFIED without real
// proof, findings are dynamically grounded, confidence never claims 1.0 —
// and (b) exercise REAL production persistence code directly
// (MemoryPersistenceStore from evidence-registry-persistence.ts,
// M365SnapshotRepository) to prove or disprove cross-tenant denial against
// the actual code paths cited as evidence, not fabricated assertions.

import test from "node:test";
import assert from "node:assert/strict";
import {
  DATABASE_TENANT_ISOLATION_DOMAIN_IDS,
  buildDatabaseTenantIsolationDomainResults,
  getDatabaseTenantIsolationAuthority,
} from "../lib/database-tenant-isolation/database-tenant-isolation-verification-authority";
import { MemoryPersistenceStore } from "../lib/evidence-registry/evidence-registry-persistence";
import { m365SnapshotRepository } from "../lib/connectors/m365/m365-snapshot-repository";

// ─── Part A — Authority model: domain registry, honesty constraints ───────

test("8 database tenant isolation domains are registered, derived from real repository inspection", () => {
  assert.equal(DATABASE_TENANT_ISOLATION_DOMAIN_IDS.length, 8);
  const results = buildDatabaseTenantIsolationDomainResults();
  assert.equal(results.length, 8);
  const ids = new Set(results.map((r) => r.domain));
  for (const id of DATABASE_TENANT_ISOLATION_DOMAIN_IDS) assert.ok(ids.has(id));
});

test("no domain reports VERIFIED — proof requires repository scoping + trusted route + cross-tenant test, which no domain fully has yet", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  for (const r of results) {
    assert.notEqual(r.verdict, "VERIFIED", `${r.domain} must not be VERIFIED without full proof`);
  }
});

test("a domain is never VERIFIED merely because it has a tenantId column — audit-ledger-tables is UNKNOWN despite tenantId columns", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  const auditLedger = results.find((r) => r.domain === "audit-ledger-tables")!;
  assert.equal(auditLedger.verdict, "UNKNOWN");
  assert.ok(auditLedger.evidence.some((e) => e.description.toLowerCase().includes("column")));
});

test("memory-only stores are never reported as database-verified — m365 snapshot store is NOT_APPLICABLE", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  const m365 = results.find((r) => r.domain === "m365-connector-snapshot-store")!;
  assert.equal(m365.verdict, "NOT_APPLICABLE");
  assert.ok(m365.evidence.some((e) => e.description.toLowerCase().includes("memory-only")));
});

test("route boundary domain is FAILED, citing the real governed-execution.ts client-override bug", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  const route = results.find((r) => r.domain === "route-to-repository-boundary")!;
  assert.equal(route.verdict, "FAILED");
  assert.ok(route.findings.some((f) => f.affectedFiles.some((p) => p.includes("governed-execution.ts"))));
  assert.ok(route.findings.some((f) => f.severity === "CRITICAL"));
});

test("connector credential store domain is FAILED, citing the absence of any tenantId parameter in the token store API", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  const ccs = results.find((r) => r.domain === "connector-credential-store")!;
  assert.equal(ccs.verdict, "FAILED");
  assert.ok(ccs.evidence.some((e) => e.filePath.includes("microsoft-token-store.ts") && e.tenantScoped === false));
});

test("evidence registry db domain cites the real Drizzle schema and repository, and is PARTIAL not VERIFIED", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  const erd = results.find((r) => r.domain === "evidence-registry-db")!;
  assert.equal(erd.verdict, "PARTIAL");
  assert.ok(erd.evidence.some((e) => e.filePath.includes("evidenceRegistry.ts")));
  assert.ok(erd.evidence.some((e) => e.filePath.includes("evidence-registry-repository.ts")));
});

test("cross-tenant test coverage meta-domain is UNKNOWN, honestly documenting that no test proves live-DB cross-tenant denial", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  const ctc = results.find((r) => r.domain === "cross-tenant-test-coverage")!;
  assert.equal(ctc.verdict, "UNKNOWN");
});

test("every FAILED or UNKNOWN domain has at least one finding with a concrete remediation", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  for (const r of results) {
    if (r.verdict === "FAILED" || r.verdict === "UNKNOWN") {
      assert.ok(r.findings.length > 0, `${r.domain} (${r.verdict}) should have findings`);
      for (const f of r.findings) {
        assert.ok(f.remediation.length > 10);
        assert.ok(f.affectedFiles.length > 0);
      }
    }
  }
});

test("getDatabaseTenantIsolationAuthority reports authority name and FAILED platform verdict deterministically", () => {
  const a = getDatabaseTenantIsolationAuthority();
  assert.equal(a.authority, "DATABASE_TENANT_ISOLATION_VERIFICATION");
  assert.equal(a.platformVerdict, "FAILED");
  const b = getDatabaseTenantIsolationAuthority();
  assert.equal(a.platformVerdict, b.platformVerdict);
  assert.deepEqual(a.summary, b.summary);
});

test("summary reports zero VERIFIED domains and counts add up to total domains", () => {
  const a = getDatabaseTenantIsolationAuthority();
  assert.equal(a.summary.verifiedDomains, 0);
  const total = a.summary.verifiedDomains + a.summary.partialDomains + a.summary.unknownDomains + a.summary.failedDomains + a.summary.notApplicableDomains;
  assert.equal(total, a.domainResults.length);
});

test("criticalFindings includes only CRITICAL/HIGH severity findings, and includes governed-execution and token-store findings", () => {
  const a = getDatabaseTenantIsolationAuthority();
  for (const f of a.criticalFindings) {
    assert.ok(f.severity === "CRITICAL" || f.severity === "HIGH");
  }
  assert.ok(a.criticalFindings.some((f) => f.affectedFiles.some((p) => p.includes("governed-execution.ts"))));
  assert.ok(a.criticalFindings.some((f) => f.affectedFiles.some((p) => p.includes("microsoft-token-store.ts"))));
});

test("[meta] confidence scores are within [0,1] and never claim full (1.0) confidence anywhere", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  for (const r of results) {
    assert.ok(r.confidence >= 0 && r.confidence <= 1);
    assert.ok(r.confidence < 1, `${r.domain} should never claim full 1.0 confidence given known gaps`);
    for (const e of r.evidence) {
      assert.ok(e.confidence >= 0 && e.confidence <= 1);
    }
  }
});

test("[meta] no domain reports VERIFIED while having zero TEST_PROOF evidence", () => {
  const results = buildDatabaseTenantIsolationDomainResults();
  for (const r of results) {
    const hasTestProof = r.evidence.some((e) => e.evidenceType === "TEST_PROOF");
    if (r.verdict === "VERIFIED") {
      assert.ok(hasTestProof, `${r.domain} cannot be VERIFIED without TEST_PROOF evidence`);
    }
  }
});

// ─── Part B — REAL behavioural tests against actual production persistence ─
// These exercise the genuine production code paths cited as evidence above.
// If tenant isolation regresses in these modules, these tests fail for real.

test("[real enforcement] MemoryPersistenceStore: tenant B cannot get/list tenant A's evidence rows", async () => {
  const store = new MemoryPersistenceStore<{ id: string; tenantId: string; payload: string }>("evidence-artifacts" as any);
  await store.upsert({ id: "rec-1", tenantId: "TENANT-A", payload: "secret-a" });
  await store.upsert({ id: "rec-2", tenantId: "TENANT-A", payload: "secret-a-2" });
  await store.upsert({ id: "rec-3", tenantId: "TENANT-B", payload: "secret-b" });

  // Tenant B must not be able to read tenant A's record by id, even though
  // the id alone ("rec-1") does not encode tenancy.
  const crossTenantRead = await store.get("TENANT-B", "rec-1");
  assert.equal(crossTenantRead, undefined, "tenant B must not be able to read tenant A's record by id");

  // Tenant A's own record is reachable under its own tenantId.
  const ownRead = await store.get("TENANT-A", "rec-1");
  assert.equal(ownRead?.payload, "secret-a");

  // list() must never leak cross-tenant rows.
  const tenantAList = await store.list("TENANT-A");
  const tenantBList = await store.list("TENANT-B");
  assert.equal(tenantAList.length, 2);
  assert.equal(tenantBList.length, 1);
  assert.ok(!tenantAList.some((r) => r.id === "rec-3"));
  assert.ok(!tenantBList.some((r) => r.id === "rec-1" || r.id === "rec-2"));
});

test("[real enforcement] MemoryPersistenceStore: deleteTenant only removes the calling tenant's rows", async () => {
  const store = new MemoryPersistenceStore<{ id: string; tenantId: string }>("evidence-links" as any);
  await store.upsert({ id: "link-1", tenantId: "TENANT-A" });
  await store.upsert({ id: "link-2", tenantId: "TENANT-B" });

  await store.deleteTenant("TENANT-A");

  assert.equal(await store.get("TENANT-A", "link-1"), undefined, "tenant A's row should be deleted");
  const tenantBAfter = await store.get("TENANT-B", "link-2");
  assert.ok(tenantBAfter, "tenant B's row must survive tenant A's deleteTenant call");
});

test("[real enforcement] MemoryPersistenceStore: upsert keyed by tenantId+id cannot be cross-tenant overwritten", async () => {
  const store = new MemoryPersistenceStore<{ id: string; tenantId: string; value: number }>("provenance-events" as any);
  await store.upsert({ id: "shared-id", tenantId: "TENANT-A", value: 1 });
  await store.upsert({ id: "shared-id", tenantId: "TENANT-B", value: 2 });

  // Both rows must coexist independently because the internal key is
  // `${tenantId}:${id}`, not just `${id}`.
  const a = await store.get("TENANT-A", "shared-id");
  const b = await store.get("TENANT-B", "shared-id");
  assert.equal(a?.value, 1);
  assert.equal(b?.value, 2);
});

test("[real enforcement] M365SnapshotRepository: tenant B cannot read tenant A's discovery snapshot (cross-program regression guard)", () => {
  m365SnapshotRepository.clearForTests();
  m365SnapshotRepository.upsertSnapshot({
    snapshot: { snapshotId: "snap-db-A", tenantId: "TENANT-A", capturedAt: new Date().toISOString() } as any,
    users: [{ id: "user-a-1" } as any],
    licenseAssignments: [],
    skus: [],
    usageRecords: [],
    mailboxes: [],
    groups: [],
    discoveryRun: { snapshotId: "snap-db-A", tenantId: "TENANT-A" } as any,
  });

  assert.equal(m365SnapshotRepository.getLatest("TENANT-B"), null);
  assert.deepEqual(m365SnapshotRepository.listUsers("TENANT-B"), []);
  assert.equal(m365SnapshotRepository.getLatest("TENANT-A")?.snapshot.snapshotId, "snap-db-A");

  m365SnapshotRepository.clearForTests();
});

// ─── Part C — Honest documentation of FAILED/UNKNOWN domains ──────────────

test("[honest gap] governed-execution.ts route boundary bug is real: client tenantId in body silently overrides server-derived tenant", async () => {
  // This is a direct static-pattern regression guard: the file's create
  // handler must use the SAFE spread order ({...req.body, tenantId}) once
  // fixed. Until then, this test documents the FAILED finding rather than
  // fabricating a passing assertion about a control that doesn't exist.
  const fs = await import("node:fs");
  const path = await import("node:path");
  const filePath = path.resolve(process.cwd(), "src/routes/governed-execution.ts");
  const source = fs.readFileSync(filePath, "utf8");
  const hasUnsafeOrder = /tenantId:\s*tenant\(req\)\s*,\s*\.\.\.\(?req\.body/.test(source);
  // Document the current state: if the unsafe order is still present, the
  // FAILED verdict above is justified and this assertion passes, honestly
  // reflecting the real bug. If a future fix changes the order, this
  // assertion will fail, signalling the authority model's finding must be
  // updated too — preventing silent drift between code and audit.
  assert.ok(hasUnsafeOrder, "governed-execution.ts still has the unsafe tenantId-first spread order this audit's FAILED verdict is based on");
});

test("[honest gap] microsoft-token-store.ts genuinely has no tenantId parameter on any lookup method", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const filePath = path.resolve(process.cwd(), "src/lib/microsoft-auth/microsoft-token-store.ts");
  const source = fs.readFileSync(filePath, "utf8");
  assert.ok(!/getConnection\([^)]*tenantId/.test(source), "getConnection must currently have no tenantId parameter (documents the FAILED finding)");
  assert.ok(!/getTokenSet\([^)]*tenantId/.test(source), "getTokenSet must currently have no tenantId parameter (documents the FAILED finding)");
});
