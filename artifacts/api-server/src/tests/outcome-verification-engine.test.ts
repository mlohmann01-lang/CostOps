import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildEvidencePack, calculateVariance, calculateVerificationConfidence, detectVerificationFailure, verifyOutcome } from "../lib/outcomes/outcome-verification-engine";

function outcome(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    tenantId: "tenant-a",
    recommendationId: 7,
    userEmail: "user@contoso.com",
    displayName: "Contoso User",
    action: "M365 License Reclaim",
    licenceSku: "SPE_E5",
    beforeCost: 3290,
    afterCost: 2450,
    monthlySaving: 840,
    annualisedSaving: 10080,
    approved: true,
    executed: true,
    executionMode: "LIVE_OPERATOR_TRIGGERED",
    playbookId: "m365_inactive_user_reclaim",
    playbookName: "M365 inactive user reclaim",
    actionRiskProfile: {},
    trustSnapshot: {},
    beforeState: { assignedLicenses: 47, monthlyCost: 3290 },
    afterState: { assignedLicenses: 35, monthlyCost: 2450 },
    dryRunResult: {},
    executionEvidence: { graphRequestId: "graph-1" },
    evidence: { verificationState: "VERIFIED" },
    pricingSnapshot: { sku: "SPE_E5", monthlyUnitCost: 70 },
    pricingConfidence: "VERIFIED_CONTRACT",
    pricingSource: "Contoso EA",
    savingConfidence: "ESTIMATED",
    actorId: "operator",
    executionStatus: "EXECUTED",
    idempotencyKey: "idem-1",
    approvedAt: new Date("2026-05-30T10:00:00.000Z"),
    executedAt: new Date("2026-05-30T10:15:00.000Z"),
    createdAt: new Date("2026-05-30T09:00:00.000Z"),
    ...overrides,
  } as any;
}

test("builds verification pack with before/after state and evidence sources", () => {
  const pack = buildEvidencePack(outcome());
  assert.equal(pack.beforeState.assignedLicenses, 47);
  assert.equal(pack.afterState.assignedLicenses, 35);
  assert.equal(pack.verificationMethod, "GRAPH_SNAPSHOT_AND_PRICING");
  assert.ok(pack.evidenceSources.includes("Graph assignment snapshot"));
  assert.ok(pack.evidenceSources.includes("SKU pricing reference"));
  assert.deepEqual(pack.executionTimeline.map((event) => event.stage), ["Discovery", "Recommendation", "Approval", "Execution", "Verification", "Outcome"]);
});

test("verified M365 reclaim returns high confidence and savings variance", () => {
  const result = verifyOutcome(outcome());
  assert.equal(result.verificationStatus, "VERIFIED");
  assert.equal(result.verificationConfidence, "HIGH");
  assert.equal(result.verifiedMonthlySaving, 840);
  assert.equal(result.varianceAmount, 0);
});

test("confidence bands are not percentages", () => {
  assert.equal(calculateVerificationConfidence({ status: "PENDING", evidenceSources: [] }), "LOW");
  assert.equal(calculateVerificationConfidence({ status: "VERIFIED", evidenceSources: ["Graph assignment snapshot"], beforeState: { a: 1 }, afterState: { b: 2 }, pricingConfidence: "VERIFIED_CONTRACT", verifiedMonthlySaving: 10 }), "HIGH");
});

test("variance calculation handles pending verification", () => {
  assert.deepEqual(calculateVariance(100, null), { varianceAmount: null, variancePct: null });
  assert.deepEqual(calculateVariance(100, 80), { varianceAmount: -20, variancePct: -20 });
});

test("detects verification failure", () => {
  assert.equal(detectVerificationFailure(outcome({ afterCost: 4000 })), "AFTER_COST_EXCEEDS_BEFORE_COST");
  const result = verifyOutcome(outcome({ executed: false, executionStatus: "FAILED" }));
  assert.equal(result.verificationStatus, "FAILED");
  assert.equal(result.failureReason, "OUTCOME_NOT_EXECUTED");
});

test("outcome APIs are tenant scoped and expose evidence endpoints", async () => {
  const routes = await readFile("src/routes/outcomes.ts", "utf8");
  assert.equal(routes.includes("/:id/evidence"), true);
  assert.equal(routes.includes("/:id/verification"), true);
  assert.equal(routes.includes("/unverified"), true);
  assert.equal(routes.includes("/:id/reverify"), true);
  assert.equal(routes.includes("eq(outcomeLedgerTable.tenantId, tenantId)"), true);
});
