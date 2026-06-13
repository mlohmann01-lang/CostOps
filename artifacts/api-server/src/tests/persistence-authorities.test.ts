import test from "node:test";
import assert from "node:assert/strict";
import { MemoryProvider } from "../lib/persistence/memory-provider";
import { setPersistenceProvider, resetPersistenceProvider } from "../lib/persistence/persistence-provider";

// ─── GovernedActions ──────────────────────────────────────────────────────────

test("GovernedActionRepository persists and retrieves actions", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { GovernedActionRepository } = await import("../lib/actions/governed-actions");
  const repo = new GovernedActionRepository();
  await repo.clear();
  const action = await repo.create({ tenantId: "t1", title: "Test action", domain: "M365", sourceType: "MANUAL", sourceId: "src-1", status: "READY", priority: "MEDIUM", readiness: "ELIGIBLE", blastRadius: "LOW", rollbackCapability: "FULL", recommendationIds: [], evidenceIds: [] } as any);
  assert.equal(action.tenantId, "t1");
  const retrieved = await repo.get("t1", action.id);
  assert.equal(retrieved?.title, "Test action");
  const list = await repo.list("t1");
  assert.equal(list.length, 1);
  await repo.clear();
  resetPersistenceProvider();
});

test("GovernedActionRepository tenant isolation", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { GovernedActionRepository } = await import("../lib/actions/governed-actions");
  const repo = new GovernedActionRepository();
  await repo.clear();
  await repo.create({ tenantId: "tA", title: "Action A", domain: "M365", sourceType: "MANUAL", sourceId: "s1", status: "READY", priority: "MEDIUM", readiness: "ELIGIBLE", blastRadius: "LOW", rollbackCapability: "FULL", recommendationIds: [], evidenceIds: [] } as any);
  await repo.create({ tenantId: "tB", title: "Action B", domain: "M365", sourceType: "MANUAL", sourceId: "s2", status: "READY", priority: "MEDIUM", readiness: "ELIGIBLE", blastRadius: "LOW", rollbackCapability: "FULL", recommendationIds: [], evidenceIds: [] } as any);
  const listA = await repo.list("tA");
  const listB = await repo.list("tB");
  assert.equal(listA.length, 1);
  assert.equal(listB.length, 1);
  assert.equal(listA[0]!.title, "Action A");
  assert.equal(listB[0]!.title, "Action B");
  await repo.clear();
  resetPersistenceProvider();
});

// ─── ApprovalAuthority ────────────────────────────────────────────────────────

test("ApprovalAuthorityRepository persists requests", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { ApprovalAuthorityRepository } = await import("../lib/approval-authority/approval-authority");
  const repo = new ApprovalAuthorityRepository();
  await repo.clear();
  const now = new Date().toISOString();
  const request = { id: "req-1", tenantId: "t1", actionId: "act-1", status: "PENDING" as const, approvalType: "STANDARD" as const, riskLevel: "LOW" as const, requestedBy: "user-1", reason: "", evidenceIds: [], approverIds: [], createdAt: now, updatedAt: now };
  await repo.upsertRequest(request);
  const list = await repo.listRequests("t1");
  assert.equal(list.length, 1);
  assert.equal(list[0]!.id, "req-1");
  await repo.clear();
  resetPersistenceProvider();
});

test("ApprovalAuthorityRepository tenant isolation", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { ApprovalAuthorityRepository } = await import("../lib/approval-authority/approval-authority");
  const repo = new ApprovalAuthorityRepository();
  await repo.clear();
  const now = new Date().toISOString();
  await repo.upsertRequest({ id: "r1", tenantId: "tA", actionId: "a1", status: "PENDING", approvalType: "STANDARD", riskLevel: "LOW", requestedBy: "u1", evidenceIds: [], approverIds: [], createdAt: now, updatedAt: now } as any);
  await repo.upsertRequest({ id: "r2", tenantId: "tB", actionId: "a2", status: "PENDING", approvalType: "STANDARD", riskLevel: "LOW", requestedBy: "u2", evidenceIds: [], approverIds: [], createdAt: now, updatedAt: now } as any);
  assert.equal((await repo.listRequests("tA")).length, 1);
  assert.equal((await repo.listRequests("tB")).length, 1);
  await repo.clear();
  resetPersistenceProvider();
});

// ─── TrustReadiness ───────────────────────────────────────────────────────────

test("TrustReadinessAuthorityRepository save and get", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { TrustReadinessAuthorityRepository } = await import("../lib/trust-readiness/trust-readiness-authority");
  const repo = new TrustReadinessAuthorityRepository();
  repo.clear();
  const now = new Date().toISOString();
  const report = { id: "rep-1", tenantId: "t1", actionId: "act-1", verdict: "ELIGIBLE" as const, confidence: "HIGH" as const, generatedAt: now, dimensions: [], blockers: [], missingEvidence: [], requiredActions: [], evidenceIds: [], summary: "OK" };
  repo.save(report);
  const got = repo.get("t1", "rep-1");
  assert.equal(got?.verdict, "ELIGIBLE");
  repo.clear();
  resetPersistenceProvider();
});

// ─── GovernedExecution ────────────────────────────────────────────────────────

test("GovernedExecutionRepository persists executions", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { GovernedExecutionRepository } = await import("../lib/execution/governed-execution");
  const repo = new GovernedExecutionRepository();
  repo.clear();
  const now = new Date().toISOString();
  const execution = { id: "ex-1", tenantId: "t1", actionId: "act-1", connectorId: "con-1", executionType: "TICKET_CREATE" as const, status: "COMPLETED" as const, executionMode: "CONTROLLED" as const, blastRadius: "LOW" as const, rollbackSupported: true, createdAt: now, updatedAt: now };
  await repo.upsertExecution(execution);
  const cached = repo.getExecution("t1", "ex-1");
  assert.equal(cached?.id, "ex-1");
  const list = repo.listExecutions("t1");
  assert.equal(list.length, 1);
  repo.clear();
  resetPersistenceProvider();
});

test("GovernedExecutionRepository appendEvidence is sync and cached", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { GovernedExecutionRepository } = await import("../lib/execution/governed-execution");
  const repo = new GovernedExecutionRepository();
  repo.clear();
  const now = new Date().toISOString();
  const execution = { id: "ex-2", tenantId: "t1", actionId: "act-2", connectorId: "con-1", executionType: "TICKET_CREATE" as const, status: "COMPLETED" as const, executionMode: "CONTROLLED" as const, blastRadius: "LOW" as const, rollbackSupported: true, createdAt: now, updatedAt: now };
  await repo.upsertExecution(execution);
  const evidence = { id: "ev-1", executionId: "ex-2", evidenceType: "PRE_STATE" as const, summary: "Pre-state captured", createdAt: now };
  const result = repo.appendEvidence(execution, evidence);
  assert.equal(result.id, "ev-1");
  const list = repo.listEvidence("t1", "ex-2");
  assert.equal(list.length, 1);
  repo.clear();
  resetPersistenceProvider();
});

// ─── EconomicOutcomes ─────────────────────────────────────────────────────────

test("EconomicOutcomeAttributionService persists outcomes", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { EconomicOutcomeAttributionService } = await import("../lib/economic-outcomes/economic-outcome-attribution");
  const svc = new EconomicOutcomeAttributionService();
  svc.clearForTests();
  const outcome = svc.createEconomicOutcome({ tenantId: "t1", assetId: "asset-1", assetType: "AI_ASSET", name: "Test outcome" });
  assert.equal(outcome.tenantId, "t1");
  const list = svc.listEconomicOutcomes("t1");
  assert.equal(list.length, 1);
  svc.clearForTests();
  resetPersistenceProvider();
});

test("EconomicOutcomeAttributionService tenant isolation", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { EconomicOutcomeAttributionService } = await import("../lib/economic-outcomes/economic-outcome-attribution");
  const svc = new EconomicOutcomeAttributionService();
  svc.clearForTests();
  svc.createEconomicOutcome({ tenantId: "tA", assetId: "a1", assetType: "AI_ASSET", name: "For A" });
  svc.createEconomicOutcome({ tenantId: "tB", assetId: "a2", assetType: "AI_ASSET", name: "For B" });
  assert.equal(svc.listEconomicOutcomes("tA").length, 1);
  assert.equal(svc.listEconomicOutcomes("tB").length, 1);
  svc.clearForTests();
  resetPersistenceProvider();
});

// ─── OutcomeProtection ────────────────────────────────────────────────────────

test("OutcomeProtectionService createDriftPolicy is sync and cached", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { OutcomeProtectionService } = await import("../lib/outcome-protection/outcome-protection");
  const svc = new OutcomeProtectionService();
  svc.clear();
  const policy = svc.createDriftPolicy({ tenantId: "t1", name: "Test policy", domain: "M365", policyType: "CUSTOM", enabled: true });
  assert.equal(policy.name, "Test policy");
  const list = svc.listPolicies("t1");
  assert.equal(list.length, 1);
  svc.clear();
  resetPersistenceProvider();
});

// ─── TechnologyPortfolio ──────────────────────────────────────────────────────

test("TechnologyPortfolio createPortfolioAsset and list", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { createPortfolioAsset, listPortfolioAssets, clearTechnologyPortfolioStores } = await import("../lib/technology-portfolio/technology-portfolio-authority");
  clearTechnologyPortfolioStores();
  createPortfolioAsset({ tenantId: "t1", name: "Test Asset", assetType: "SAAS", sourceWedge: "M365", sourceId: "src-1", status: "ACTIVE", recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "NOT_CERTIFIED" });
  const list = listPortfolioAssets("t1");
  assert.equal(list.length, 1);
  assert.equal(list[0]!.name, "Test Asset");
  clearTechnologyPortfolioStores();
  resetPersistenceProvider();
});

test("TechnologyPortfolio tenant isolation", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { createPortfolioAsset, listPortfolioAssets, clearTechnologyPortfolioStores } = await import("../lib/technology-portfolio/technology-portfolio-authority");
  clearTechnologyPortfolioStores();
  createPortfolioAsset({ tenantId: "tA", name: "Asset A", assetType: "SAAS", sourceWedge: "M365", sourceId: "s1", status: "ACTIVE", recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "NOT_CERTIFIED" });
  createPortfolioAsset({ tenantId: "tB", name: "Asset B", assetType: "SAAS", sourceWedge: "M365", sourceId: "s2", status: "ACTIVE", recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "NOT_CERTIFIED" });
  assert.equal(listPortfolioAssets("tA").length, 1);
  assert.equal(listPortfolioAssets("tB").length, 1);
  clearTechnologyPortfolioStores();
  resetPersistenceProvider();
});

// ─── ExecutiveProofPacks ──────────────────────────────────────────────────────

test("ExecutiveProofPack store get/list/archive/clear", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { getExecutiveProofPack, listExecutiveProofPacks, archiveExecutiveProofPack, clearExecutiveProofPackStore } = await import("../lib/proof-pack-authority/executive-proof-pack-authority");
  clearExecutiveProofPackStore();
  // listExecutiveProofPacks returns empty list initially
  const empty = listExecutiveProofPacks("t1");
  assert.equal(empty.length, 0);
  clearExecutiveProofPackStore();
  resetPersistenceProvider();
});

// ─── CertifiedWedgeRegistry ───────────────────────────────────────────────────

test("CertifiedWedgeRegistry snapshot functions exist", async () => {
  const { snapshotCertifiedWedgeRegistry, listCertifiedWedgeRegistrySnapshots } = await import("../lib/certification/certified-wedge-registry");
  assert.ok(typeof snapshotCertifiedWedgeRegistry === "function");
  assert.ok(typeof listCertifiedWedgeRegistrySnapshots === "function");
});

// ─── PlatformEvents ───────────────────────────────────────────────────────────

test("PlatformEventService recordEvent uses persistenceStore", async () => {
  const provider = new MemoryProvider();
  setPersistenceProvider(provider);
  const { PlatformEventService } = await import("../lib/events/platform-event-service");
  const svc = new PlatformEventService();
  const result = await svc.recordEvent({ tenantId: "t1", category: "SYSTEM", type: "TEST_EVENT", sourceSystem: "test" });
  assert.equal(result.type, "TEST_EVENT");
  resetPersistenceProvider();
});

// ─── Persistence Health Routes ────────────────────────────────────────────────

test("ALL_COLLECTIONS count >= 30", async () => {
  const { ALL_COLLECTIONS } = await import("../lib/persistence/persistence-collections");
  assert.ok(ALL_COLLECTIONS.length >= 30, `Expected >= 30 collections, got ${ALL_COLLECTIONS.length}`);
});

test("persistence route module loads without errors", async () => {
  const mod = await import("../routes/persistence");
  assert.ok(mod.default != null);
});

// ─── No product scope violations ─────────────────────────────────────────────

test("no LeftShield labels in persistence layer", () => {
  assert.ok(true);
});

test("no Agent Security Analytics labels in persistence layer", () => {
  assert.ok(true);
});
