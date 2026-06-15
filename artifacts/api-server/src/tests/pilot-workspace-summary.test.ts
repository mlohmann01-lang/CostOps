import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPilotWorkspaceSummary,
  runPilotWorkspaceAudit,
} from "../lib/pilot-workspace-summary";
import {
  TechnologyCommercialAuthorityService,
  TechnologyCommercialAuthorityRepository,
  createInMemoryTechnologyCommercialAuthorityStores,
} from "../lib/technology-commercial-authority";
import {
  FinancialTruthAuthorityService,
  FinancialTruthAuthorityRepository,
  createInMemoryFinancialTruthAuthorityStores,
} from "../lib/financial-truth-authority";
import {
  OwnershipIntelligenceService,
  OwnershipIntelligenceRepository,
  createInMemoryOwnershipIntelligenceStores,
} from "../lib/ownership-intelligence";
import {
  OutcomeFinanceReconciliationService,
  OutcomeFinanceReconciliationRepository,
  createInMemoryOutcomeFinanceReconciliationStores,
  InMemoryOutcomeFinanceGraphWriter,
} from "../lib/outcome-finance-reconciliation";
import {
  EconomicGraphService,
  InMemoryEconomicGraphRepository,
} from "../lib/economic-graph";
const fixed = () => "2026-06-15T00:00:00.000Z";
async function seeded() {
  const tenantId = "pilot-a";
  const other = "pilot-b";
  const graphRepo = new InMemoryEconomicGraphRepository();
  const graph = new EconomicGraphService(graphRepo);
  const commercialRepo = new TechnologyCommercialAuthorityRepository(
    createInMemoryTechnologyCommercialAuthorityStores(),
  );
  const commercial = new TechnologyCommercialAuthorityService(
    commercialRepo,
    graph,
  );
  const financialRepo = new FinancialTruthAuthorityRepository(
    createInMemoryFinancialTruthAuthorityStores(),
  );
  const financial = new FinancialTruthAuthorityService(financialRepo, graph);
  const ownershipRepo = new OwnershipIntelligenceRepository(
    createInMemoryOwnershipIntelligenceStores(),
  );
  const ownership = new OwnershipIntelligenceService(ownershipRepo, graph);
  const outcomeRepo = new OutcomeFinanceReconciliationRepository(
    createInMemoryOutcomeFinanceReconciliationStores(),
  );
  const outcome = new OutcomeFinanceReconciliationService(
    outcomeRepo,
    new InMemoryOutcomeFinanceGraphWriter(),
  );
  const vendor = await commercial.createVendor({
    tenantId,
    name: "Acme",
    category: "SAAS",
    currency: "USD",
    riskLevel: "LOW",
  });
  const contract = await commercial.createContract({
    tenantId,
    vendorId: vendor.id,
    name: "Acme SaaS",
    status: "ACTIVE",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    autoRenewal: true,
    currency: "USD",
    auditRights: true,
    trueUpRights: true,
  });
  const ent = await commercial.createEntitlement({
    tenantId,
    vendorId: vendor.id,
    contractId: contract.id,
    productName: "Seats",
    entitlementType: "SEAT",
    totalQuantity: 10,
    currency: "USD",
  });
  await commercial.createCommitment({
    tenantId,
    vendorId: vendor.id,
    contractId: contract.id,
    entitlementId: ent.id,
    commitmentType: "MINIMUM_SEATS",
    committedValue: 10,
    consumedValue: 8,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  });
  await commercial.createRenewal({
    tenantId,
    vendorId: vendor.id,
    contractId: contract.id,
    renewalDate: "2026-11-01",
    currentAnnualSpend: 1000,
    negotiationLeverage: "HIGH",
    readinessScore: 80,
    status: "APPROVED",
  });
  const cc = await financial.createCostCentre({
    tenantId,
    code: "IT",
    name: "IT",
    currency: "USD",
  });
  const po = await financial.createPurchaseOrder({
    tenantId,
    poNumber: "PO-1",
    vendorId: vendor.id,
    amount: 100,
    currency: "USD",
    status: "APPROVED",
    costCentreId: cc.id,
  });
  await financial.createInvoice({
    tenantId,
    invoiceNumber: "INV-1",
    vendorId: vendor.id,
    purchaseOrderId: po.id,
    costCentreId: cc.id,
    invoiceDate: "2026-01-01",
    amount: 95,
    currency: "USD",
    status: "PAID",
  });
  await financial.createVendorSpend({
    tenantId,
    vendorId: vendor.id,
    fiscalPeriod: "2026-01",
    fiscalYear: "2026",
    totalInvoiced: 95,
    totalPaid: 95,
    currency: "USD",
  });
  const rec = await financial.createReconciliation({
    tenantId,
    vendorId: vendor.id,
    projectedSavings: 100,
    expectedSavings: 90,
    verifiedSavings: 80,
    status: "VERIFIED",
    evidenceRefs: ["ev-fin"],
  });
  const user = await ownership.createUser({
    tenantId,
    email: "owner@example.com",
    displayName: "Owner",
  });
  const ex = await ownership.createExecutiveOwner({
    tenantId,
    displayName: "CFO",
    costCentreIds: [cc.id],
  });
  await ownership.createAssignment({
    tenantId,
    targetType: "RECOMMENDATION",
    targetId: "rec-1",
    assignmentType: "BUSINESS_OWNER",
    ownerUserId: user.id,
    costCentreId: cc.id,
    executiveOwnerId: ex.id,
    confidence: 1,
  });
  await ownership.createApprovalRoute({
    tenantId,
    targetType: "RECOMMENDATION",
    targetId: "rec-1",
    requiredApproverUserIds: [user.id],
    requiredExecutiveOwnerIds: [ex.id],
    requiredDepartmentIds: [],
    requiredCostCentreIds: [cc.id],
    approvalReason: "BUDGET_IMPACT",
    status: "READY",
  });
  const attr = await outcome.createAttribution({
    tenantId,
    recommendationId: "rec-1",
    financeReconciliationId: rec.id,
    costCentreId: cc.id,
    executiveOwnerId: ex.id,
    projectedSavings: 100,
    expectedSavings: 90,
    executedSavings: 85,
    verifiedSavings: 80,
    currency: "USD",
    status: "VERIFIED",
    confidence: "HIGH",
    evidenceRefs: ["ev-fin"],
  });
  await outcome.appendValueLedgerEntry({
    tenantId,
    attributionId: attr.id,
    eventType: "APPROVED_VALUE_RECORDED",
    amount: 90,
    currency: "USD",
  });
  await graph.createNode({
    tenantId,
    entityType: "RECOMMENDATION",
    canonicalName: "rec-1",
    canonicalKey: "rec-1",
    confidenceScore: 1,
    evidence: [
      { sourceSystem: "test", sourceReferenceId: "rec-1", observedAt: fixed() },
    ],
  });
  return {
    tenantId,
    other,
    deps: {
      commercialRepo,
      financialRepo,
      ownershipRepo,
      outcomeRepo,
      graph,
      audit: async () => ({ status: "PASS" }),
      now: fixed,
    },
  };
}
test("demo mode returns labelled demo data", async () => {
  const s = await buildPilotWorkspaceSummary("demo", "DEMO", { now: fixed });
  assert.equal(s.mode, "DEMO");
  assert.equal(s.demoBanner?.label, "Demo data");
  assert.equal(s.executiveValue.financeVerifiedValue! > 0, true);
});
test("live mode does not return demo data and empty state is unavailable not zero", async () => {
  const { deps } = await seeded();
  const s = await buildPilotWorkspaceSummary("empty-live", "LIVE", deps);
  assert.equal(s.mode, "LIVE");
  assert.equal(s.demoBanner, undefined);
  assert.equal(s.executiveValue.financeVerifiedValue, undefined);
  assert.equal(s.executiveValue.status, "UNAVAILABLE");
  assert.equal(s.commercialPosition.status, "UNAVAILABLE");
  assert.equal(
    s.nextSteps.some((n) =>
      n.description.includes("Verified value unavailable"),
    ),
    true,
  );
});
test("summary aggregates value commercial financial ownership graph audit and tenant isolation", async () => {
  const { tenantId, other, deps } = await seeded();
  const s = await buildPilotWorkspaceSummary(tenantId, "LIVE", deps);
  assert.equal(s.executiveValue.financeVerifiedValue, 80);
  assert.equal(s.commercialPosition.vendorCount, 1);
  assert.equal(s.commercialPosition.contractCount, 1);
  assert.equal(s.financialTruth.costCentreCount, 1);
  assert.equal(s.financialTruth.invoiceCount, 1);
  assert.equal(s.financialTruth.purchaseOrderCount, 1);
  assert.equal(s.financialTruth.vendorSpendCount, 1);
  assert.equal(s.ownershipCoverage.completenessScore, 100);
  assert.equal(s.graphHealth.economicControlChainAudit, "PASS");
  assert.equal(s.nextSteps.length, 0);
  const iso = await buildPilotWorkspaceSummary(other, "LIVE", deps);
  assert.equal(iso.commercialPosition.vendorCount, 0);
  assert.equal(iso.executiveValue.financeVerifiedValue, undefined);
});
test("PILOT_WORKSPACE_READY audit passes", async () => {
  const a = await runPilotWorkspaceAudit({ now: fixed });
  assert.equal(a.code, "PILOT_WORKSPACE_READY");
  assert.equal(a.status, "PASS");
});
