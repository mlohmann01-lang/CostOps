import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RecommendationExplainabilityService } from "../lib/recommendations/recommendation-explainability-service";
import { generateTrustFindings } from "../lib/trust/trust-findings-service";

const base = (overrides: any = {}) => ({
  recommendationId: "rec-1",
  tenantId: "tenant-a",
  actionType: "REMOVE_LICENSE",
  playbookId: "M365_INACTIVE_USER_LICENSE_RECLAIM",
  targetEntityId: "user-1",
  targetEntityType: "USER",
  recommendationState: "EXECUTION_READY",
  executionReadiness: "READY_FOR_EXECUTION",
  confidenceScore: 0.92,
  reliabilityBand: "HIGH",
  savingsConfidence: "HIGH",
  discoveryLifecycleState: "TRUSTED",
  projectedMonthlySavings: 100,
  projectedAnnualSavings: 1200,
  blockedReasons: [],
  readinessReasons: ["IDENTITY_COMPLETE", "USAGE_EVIDENCE_COMPLETE"],
  evidencePointers: ["ev-discovery-1"],
  sourceReferences: ["M365"],
  graphNodeIds: ["node:user-1"],
  requiredApprovals: [],
  actionRiskClass: "LOW",
  approvalState: null,
  executionRequestState: null,
  ...overrides,
});

function serviceFor(rows: any[]) {
  return new RecommendationExplainabilityService({ getByRecommendationId: async (tenantId: string, id: string) => rows.find((r) => r.tenantId === tenantId && r.recommendationId === id) ?? null } as any);
}

test("eligible recommendation returns evidence chain", async () => {
  const out = await serviceFor([base()]).explain("tenant-a", "rec-1");
  assert.equal(out?.readinessState, "READY_FOR_EXECUTION");
  assert.equal(out?.trustBand, "TRUSTED");
  assert.ok(out?.evidenceChain.some((step) => step.step === "DISCOVERY_SOURCE"));
  assert.ok(out?.evidenceChain.some((step) => step.step === "POLICY_GATE"));
});

test("blocked recommendation returns trust blockers and unlock value", async () => {
  const out = await serviceFor([base({ executionReadiness: "BLOCKED", recommendationState: "BLOCKED", blockedReasons: ["STALE_SOURCE", "IDENTITY_CONFLICT"], projectedAnnualSavings: 8200 })]).explain("tenant-a", "rec-1");
  assert.equal(out?.blockedValue, 8200);
  assert.equal(out?.unlockValue, 8200);
  assert.ok(out?.trustFindings.some((f) => f.findingType === "STALE_SOURCE"));
  assert.match(out?.explanationSummary ?? "", /unlock \$8,200/);
});

test("policy-blocked recommendation returns policy blockers", async () => {
  const out = await serviceFor([base({ executionReadiness: "BLOCKED", blockedReasons: ["POLICY_BLOCKED"], projectedAnnualSavings: 4000 })]).explain("tenant-a", "rec-1");
  assert.equal(out?.policyFindings[0].findingType, "POLICY_BLOCKED");
  assert.equal(out?.resolutionSteps[0].title, "Review governance policy");
});

test("affected recommendations by finding can be resolved from finding ids", async () => {
  const rec = base({ blockedReasons: ["MISSING_OWNER"], projectedAnnualSavings: 7200 });
  const findings = generateTrustFindings({ tenantId: "tenant-a", recommendations: [{ ...rec, connector: "AWS", sourceSystem: "AWS" }] });
  const finding = findings.find((f) => f.findingType === "MISSING_OWNER")!;
  const out = await serviceFor([rec]).explain("tenant-a", finding.affectedRecommendationIds[0]);
  assert.equal(finding.affectedValue, 7200);
  assert.equal(out?.recommendationId, "rec-1");
});

test("tenant isolation prevents cross-tenant explanation", async () => {
  const out = await serviceFor([base({ tenantId: "tenant-b" })]).explain("tenant-a", "rec-1");
  assert.equal(out, null);
});

test("explainability services are read-only and perform no mutation", async () => {
  const files = await Promise.all([
    readFile("src/lib/recommendations/recommendation-explainability-service.ts", "utf8"),
    readFile("src/lib/recommendations/trust-resolution-service.ts", "utf8"),
  ]);
  assert.equal(/\.insert\(|\.update\(|\.delete\(|POST|assignLicense|removeUserLicenses|submitForApproval/.test(files.join("\n")), false);
});
