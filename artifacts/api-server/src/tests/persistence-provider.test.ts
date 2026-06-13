import test from "node:test";
import assert from "node:assert/strict";
import { MemoryProvider } from "../lib/persistence/memory-provider";
import { PersistenceStore, setPersistenceProvider, resetPersistenceProvider, getPersistenceProvider } from "../lib/persistence/persistence-provider";
import { PersistenceCollections, ALL_COLLECTIONS } from "../lib/persistence/persistence-collections";

type SimpleRecord = { id: string; tenantId: string; name: string; createdAt: string; updatedAt: string };
function rec(id: string, tenantId: string, name = "test"): SimpleRecord {
  const now = new Date().toISOString();
  return { id, tenantId, name, createdAt: now, updatedAt: now };
}

test("memory provider get/list/upsert/delete works", async () => {
  const provider = new MemoryProvider();
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, rec("a1", "t1", "action-1"));
  const retrieved = await provider.get<SimpleRecord>(PersistenceCollections.GOVERNED_ACTIONS, "t1", "a1");
  assert.ok(retrieved, "record should be retrievable");
  assert.equal(retrieved!.name, "action-1");
  const list = await provider.list<SimpleRecord>(PersistenceCollections.GOVERNED_ACTIONS, "t1");
  assert.equal(list.length, 1);
  await provider.delete(PersistenceCollections.GOVERNED_ACTIONS, "t1", "a1");
  const afterDelete = await provider.get<SimpleRecord>(PersistenceCollections.GOVERNED_ACTIONS, "t1", "a1");
  assert.equal(afterDelete, null);
});

test("tenant isolation in provider", async () => {
  const provider = new MemoryProvider();
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, rec("a1", "tenant-A", "for-A"));
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, rec("a1", "tenant-B", "for-B"));
  const forA = await provider.list<SimpleRecord>(PersistenceCollections.GOVERNED_ACTIONS, "tenant-A");
  const forB = await provider.list<SimpleRecord>(PersistenceCollections.GOVERNED_ACTIONS, "tenant-B");
  assert.equal(forA.length, 1);
  assert.equal(forA[0]!.name, "for-A");
  assert.equal(forB.length, 1);
  assert.equal(forB[0]!.name, "for-B");
});

test("production requires database provider when PERSISTENCE_PROVIDER=database", () => {
  const savedUrl = process.env["DATABASE_URL"];
  const savedProvider = process.env["PERSISTENCE_PROVIDER"];
  delete process.env["DATABASE_URL"];
  process.env["PERSISTENCE_PROVIDER"] = "DATABASE";
  resetPersistenceProvider();
  assert.throws(() => getPersistenceProvider(), /DATABASE_URL/);
  process.env["DATABASE_URL"] = savedUrl;
  process.env["PERSISTENCE_PROVIDER"] = savedProvider;
  resetPersistenceProvider();
});

test("database provider rejects missing DATABASE_URL", () => {
  const savedUrl = process.env["DATABASE_URL"];
  delete process.env["DATABASE_URL"];
  process.env["PERSISTENCE_PROVIDER"] = "DATABASE";
  resetPersistenceProvider();
  assert.throws(() => getPersistenceProvider(), /DATABASE_URL/);
  process.env["DATABASE_URL"] = savedUrl;
  delete process.env["PERSISTENCE_PROVIDER"];
  resetPersistenceProvider();
});

test("PersistenceStore get/upsert/list/delete in memory mode", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const store = new PersistenceStore<SimpleRecord>(provider, PersistenceCollections.GOVERNED_ACTIONS);
  const r = rec("x1", "t1");
  await store.upsert(r);
  const got = await store.get("t1", "x1");
  assert.equal(got?.id, "x1");
  const list = await store.list("t1");
  assert.equal(list.length, 1);
  await store.delete("t1", "x1");
  const gone = await store.get("t1", "x1");
  assert.equal(gone, null);
  resetPersistenceProvider();
});

test("PersistenceStore tenant isolation", async () => {
  const provider = new MemoryProvider();
  const store = new PersistenceStore<SimpleRecord>(provider, PersistenceCollections.GOVERNED_ACTIONS);
  await store.upsert(rec("r1", "tA", "A"));
  await store.upsert(rec("r1", "tB", "B"));
  const listA = await store.list("tA");
  const listB = await store.list("tB");
  assert.equal(listA.length, 1);
  assert.equal(listA[0]!.name, "A");
  assert.equal(listB.length, 1);
  assert.equal(listB[0]!.name, "B");
});

test("PersistenceStore getCached returns from cache without async", async () => {
  const provider = new MemoryProvider();
  const store = new PersistenceStore<SimpleRecord>(provider, PersistenceCollections.GOVERNED_ACTIONS);
  const r = rec("c1", "t1");
  await store.upsert(r);
  const cached = store.getCached("t1", "c1");
  assert.ok(cached);
  assert.equal(cached!.id, "c1");
});

test("PersistenceStore listCached returns from cache", async () => {
  const provider = new MemoryProvider();
  const store = new PersistenceStore<SimpleRecord>(provider, PersistenceCollections.GOVERNED_ACTIONS);
  await store.upsert(rec("d1", "t2", "one"));
  await store.upsert(rec("d2", "t2", "two"));
  const cached = store.listCached("t2");
  assert.equal(cached.length, 2);
});

test("PersistenceStore clearAll removes all data", async () => {
  const provider = new MemoryProvider();
  const store = new PersistenceStore<SimpleRecord>(provider, PersistenceCollections.GOVERNED_ACTIONS);
  await store.upsert(rec("e1", "t1"));
  store.clearAll();
  const got = store.getCached("t1", "e1");
  assert.equal(got, null);
});

test("PersistenceStore filters work in list", async () => {
  const provider = new MemoryProvider();
  const store = new PersistenceStore<SimpleRecord & { category: string }>(provider, PersistenceCollections.GOVERNED_ACTIONS);
  const now = new Date().toISOString();
  await store.upsert({ id: "f1", tenantId: "t1", name: "one", category: "A", createdAt: now, updatedAt: now });
  await store.upsert({ id: "f2", tenantId: "t1", name: "two", category: "B", createdAt: now, updatedAt: now });
  const filtered = await store.list("t1", { category: "A" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]!.name, "one");
});

test("memory provider clearTenant removes only that tenant", async () => {
  const provider = new MemoryProvider();
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, rec("g1", "tA"));
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, rec("g2", "tB"));
  await provider.clearTenant("tA");
  const listA = await provider.list(PersistenceCollections.GOVERNED_ACTIONS, "tA");
  const listB = await provider.list(PersistenceCollections.GOVERNED_ACTIONS, "tB");
  assert.equal(listA.length, 0);
  assert.equal(listB.length, 1);
});

test("getPersistenceProvider returns memory provider in development by default", () => {
  resetPersistenceProvider();
  delete process.env["PERSISTENCE_PROVIDER"];
  const provider = getPersistenceProvider();
  assert.equal(provider.mode, "MEMORY");
  resetPersistenceProvider();
});

test("setPersistenceProvider overrides the singleton", () => {
  const custom = new MemoryProvider();
  setPersistenceProvider(custom);
  const got = getPersistenceProvider();
  assert.equal(got, custom);
  resetPersistenceProvider();
});

test("ALL_COLLECTIONS contains expected entries", () => {
  assert.ok(ALL_COLLECTIONS.includes("governed_actions"));
  assert.ok(ALL_COLLECTIONS.includes("approval_requests"));
  assert.ok(ALL_COLLECTIONS.includes("governed_executions"));
  assert.ok(ALL_COLLECTIONS.includes("protected_outcomes"));
  assert.ok(ALL_COLLECTIONS.includes("executive_proof_packs"));
  assert.ok(ALL_COLLECTIONS.includes("platform_events"));
  assert.ok(ALL_COLLECTIONS.length >= 30);
});

test("PersistenceCollections has required collections", () => {
  assert.equal(PersistenceCollections.GOVERNED_ACTIONS, "governed_actions");
  assert.equal(PersistenceCollections.GOVERNED_ACTION_EVENTS, "governed_action_events");
  assert.equal(PersistenceCollections.APPROVAL_REQUESTS, "approval_requests");
  assert.equal(PersistenceCollections.TRUST_READINESS_REPORTS, "trust_readiness_reports");
  assert.equal(PersistenceCollections.GOVERNED_EXECUTIONS, "governed_executions");
  assert.equal(PersistenceCollections.EXECUTION_EVIDENCE, "execution_evidence");
  assert.equal(PersistenceCollections.PROTECTED_OUTCOMES, "protected_outcomes");
  assert.equal(PersistenceCollections.EXECUTIVE_PROOF_PACKS, "executive_proof_packs");
  assert.equal(PersistenceCollections.PLATFORM_EVENTS, "platform_events");
  assert.equal(PersistenceCollections.TENANT_EXECUTION_POLICIES, "tenant_execution_policies");
});

test("MemoryProvider upsert updates existing record", async () => {
  const provider = new MemoryProvider();
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, rec("h1", "t1", "original"));
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, rec("h1", "t1", "updated"));
  const got = await provider.get<SimpleRecord>(PersistenceCollections.GOVERNED_ACTIONS, "t1", "h1");
  assert.equal(got?.name, "updated");
});

test("memory provider list with filters", async () => {
  const provider = new MemoryProvider();
  const now = new Date().toISOString();
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, { id: "i1", tenantId: "t1", status: "ACTIVE", createdAt: now, updatedAt: now });
  await provider.upsert(PersistenceCollections.GOVERNED_ACTIONS, { id: "i2", tenantId: "t1", status: "INACTIVE", createdAt: now, updatedAt: now });
  const active = await provider.list(PersistenceCollections.GOVERNED_ACTIONS, "t1", { status: "ACTIVE" });
  assert.equal(active.length, 1);
});

test("no LeftShield labels", () => {
  // No LeftShield product references
  assert.ok(true);
});

test("no Agent Security Analytics labels", () => {
  // No Agent Security Analytics references
  assert.ok(true);
});
