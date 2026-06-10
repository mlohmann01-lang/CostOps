import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { platformEventService } from "../lib/events/platform-event-service";
import { governedActionService } from "../lib/actions/governed-actions";
import { outcomeProtectionService, createProtectedOutcomeFromAction } from "../lib/outcome-protection/outcome-protection";

const tenantId = "tenant-outcome-protection-test";

async function reset() { outcomeProtectionService.clear(); await governedActionService.clear(); }
async function action(status: "VERIFIED" | "RETAINED" | "VERIFYING" | "EXECUTED" = "VERIFIED", overrides: Record<string, unknown> = {}) {
  return governedActionService.create({ tenantId, title: "Verified Snowflake savings", domain: "DATA", sourceType: "RECOMMENDATION", sourceId: "rec-data", status, priority: "HIGH", readiness: "ELIGIBLE", trustScore: 0.9, actualMonthlyValue: 3000, actualAnnualValue: 36000, projectedMonthlyValue: 3200, projectedAnnualValue: 38400, blastRadius: "LOW", rollbackCapability: "FULL", outcomeIds: ["outcome-data"], evidenceIds: ["outcome-proof", "retention-proof"], ...overrides } as any);
}
async function protectedOutcome() { const row = await action("VERIFIED"); return createProtectedOutcomeFromAction(tenantId, row.id); }
function policy() { return outcomeProtectionService.createDriftPolicy({ tenantId, name: "Spend return policy", domain: "DATA", policyType: "SPEND_REAPPEARED", checkFrequency: "DAILY", threshold: 500 }); }

test("protected outcome creation from verified action", async () => {
  await reset(); const created = await protectedOutcome();
  assert.equal(created.status, "PROTECTED");
  assert.equal(created.outcomeId, "outcome-data");
  assert.equal(created.protectedAnnualValue, 36000);
});

test("reject protection for unverified action", async () => {
  await reset(); const row = await action("VERIFYING");
  await assert.rejects(() => createProtectedOutcomeFromAction(tenantId, row.id), /OUTCOME_NOT_VERIFIED/);
});

test("drift policy creation", async () => {
  await reset(); const created = policy();
  assert.equal(created.enabled, true);
  assert.equal(outcomeProtectionService.listPolicies(tenantId)[0].id, created.id);
});

test("retention check passes without drift", async () => {
  await reset(); const outcome = await protectedOutcome();
  const check = await outcomeProtectionService.runRetentionCheck(tenantId, outcome.id);
  const updated = outcomeProtectionService.getProtectedOutcomeDetail(tenantId, outcome.id)?.outcome;
  assert.equal(check.result, "PASSED");
  assert.equal(updated?.status, "PROTECTED");
  assert.equal(updated?.retainedAnnualValue, 36000);
});

test("low severity signal produces AT_RISK", async () => {
  await reset(); const outcome = await protectedOutcome(); const driftPolicy = policy();
  await outcomeProtectionService.recordDriftSignal({ tenantId, protectedOutcomeId: outcome.id, policyId: driftPolicy.id, signalType: "USAGE_RETURNED", severity: "LOW", observedValue: 100 });
  const check = await outcomeProtectionService.runRetentionCheck(tenantId, outcome.id);
  assert.equal(check.result, "AT_RISK");
});

test("medium high critical signals produce FAILED", async () => {
  for (const severity of ["MEDIUM", "HIGH", "CRITICAL"] as const) {
    await reset(); const outcome = await protectedOutcome(); const driftPolicy = policy();
    await outcomeProtectionService.recordDriftSignal({ tenantId, protectedOutcomeId: outcome.id, policyId: driftPolicy.id, signalType: "SPEND_RETURNED", severity, observedValue: 600 });
    const check = await outcomeProtectionService.runRetentionCheck(tenantId, outcome.id);
    assert.equal(check.result, "FAILED");
  }
});

test("drift signal creates drift finding", async () => {
  await reset(); const outcome = await protectedOutcome(); const driftPolicy = policy();
  await outcomeProtectionService.recordDriftSignal({ tenantId, protectedOutcomeId: outcome.id, policyId: driftPolicy.id, signalType: "SPEND_RETURNED", severity: "MEDIUM", observedValue: 700 });
  const detail = outcomeProtectionService.getProtectedOutcomeDetail(tenantId, outcome.id);
  assert.equal(detail?.findings.length, 1);
  assert.equal(detail?.outcome.status, "DRIFTED");
});

test("drift finding maps correct drift type", async () => {
  await reset(); const outcome = await protectedOutcome(); const driftPolicy = policy();
  await outcomeProtectionService.recordDriftSignal({ tenantId, protectedOutcomeId: outcome.id, policyId: driftPolicy.id, signalType: "OWNER_REMOVED", severity: "HIGH" });
  assert.equal(outcomeProtectionService.getProtectedOutcomeDetail(tenantId, outcome.id)?.findings[0].driftType, "OWNERSHIP_DRIFT");
});

test("drift remediation creates governed action when requested", async () => {
  await reset(); const outcome = await protectedOutcome(); const driftPolicy = policy();
  await outcomeProtectionService.recordDriftSignal({ tenantId, protectedOutcomeId: outcome.id, policyId: driftPolicy.id, signalType: "CONFIG_REVERTED", severity: "CRITICAL" });
  const finding = outcomeProtectionService.getProtectedOutcomeDetail(tenantId, outcome.id)!.findings[0];
  const remediation = await outcomeProtectionService.createDriftRemediationAction({ tenantId, driftFindingId: finding.id, actionType: "CREATE_NEW_GOVERNED_ACTION" });
  const action = await governedActionService.get(tenantId, remediation.governedActionId!);
  assert.equal(action?.sourceType, "DRIFT_EVENT");
  assert.equal(action?.sourceId, finding.id);
  assert.equal(action?.status, "READY");
  assert.equal(action?.readiness, "APPROVAL_REQUIRED");
});

test("drift resolution updates finding and protected outcome", async () => {
  await reset(); const outcome = await protectedOutcome(); const driftPolicy = policy();
  await outcomeProtectionService.recordDriftSignal({ tenantId, protectedOutcomeId: outcome.id, policyId: driftPolicy.id, signalType: "SPEND_RETURNED", severity: "HIGH", observedValue: 900 });
  const finding = outcomeProtectionService.getProtectedOutcomeDetail(tenantId, outcome.id)!.findings[0];
  const resolved = await outcomeProtectionService.resolveDriftFinding({ tenantId, driftFindingId: finding.id });
  assert.equal(resolved.status, "RESOLVED");
  assert.equal(outcomeProtectionService.getProtectedOutcomeDetail(tenantId, outcome.id)?.outcome.status, "RESOLVED");
});

test("dashboard rollups", async () => {
  await reset(); const outcome = await protectedOutcome(); const driftPolicy = policy();
  await outcomeProtectionService.recordDriftSignal({ tenantId, protectedOutcomeId: outcome.id, policyId: driftPolicy.id, signalType: "SPEND_RETURNED", severity: "HIGH", observedValue: 1000 });
  await outcomeProtectionService.runRetentionCheck(tenantId, outcome.id);
  const dashboard = outcomeProtectionService.getOutcomeProtectionDashboard(tenantId);
  assert.equal(dashboard.protectedOutcomes, 1);
  assert.equal(dashboard.driftedOutcomes, 1);
  assert.equal(dashboard.driftedAnnualValue, 12000);
  assert.equal(dashboard.openDriftFindings.length, 1);
});

test("outcome ledger events", async () => {
  await reset(); const uniqueTenant = `${tenantId}-${Date.now()}`; const row = await action("VERIFIED", { tenantId: uniqueTenant });
  const outcome = await createProtectedOutcomeFromAction(uniqueTenant, row.id); const driftPolicy = outcomeProtectionService.createDriftPolicy({ tenantId: uniqueTenant, name: "Policy", domain: "DATA", policyType: "SPEND_REAPPEARED" });
  await outcomeProtectionService.runRetentionCheck(uniqueTenant, outcome.id);
  await outcomeProtectionService.recordDriftSignal({ tenantId: uniqueTenant, protectedOutcomeId: outcome.id, policyId: driftPolicy.id, signalType: "SPEND_RETURNED", severity: "HIGH" });
  const finding = outcomeProtectionService.getProtectedOutcomeDetail(uniqueTenant, outcome.id)!.findings[0];
  await outcomeProtectionService.createDriftRemediationAction({ tenantId: uniqueTenant, driftFindingId: finding.id, actionType: "MANUAL_REVIEW" });
  await outcomeProtectionService.resolveDriftFinding({ tenantId: uniqueTenant, driftFindingId: finding.id });
  const events = await platformEventService.listByEntity(uniqueTenant, "ProtectedOutcome", outcome.id);
  for (const type of ["OUTCOME_PROTECTED", "RETENTION_CHECK_PASSED", "DRIFT_SIGNAL_RECORDED", "DRIFT_DETECTED", "DRIFT_REMEDIATION_CREATED", "DRIFT_RESOLVED"]) assert.equal(events.some((event) => event.type === type), true);
});

test("tenant isolation", async () => {
  await reset(); const outcome = await protectedOutcome();
  assert.equal(outcomeProtectionService.listProtectedOutcomes(tenantId).length, 1);
  assert.equal(outcomeProtectionService.listProtectedOutcomes("other-tenant").length, 0);
  assert.equal(outcomeProtectionService.getProtectedOutcomeDetail("other-tenant", outcome.id), null);
});

test("outcome protection does not perform autonomous execution", () => {
  const model = fs.readFileSync(path.join(process.cwd(), "src/lib/outcome-protection/outcome-protection.ts"), "utf8");
  assert.equal(model.includes("autonomous: true"), false);
  assert.equal(model.includes("autonomous: false"), true);
});

test("outcome protection contains no LeftShield security objects", () => {
  const model = fs.readFileSync(path.join(process.cwd(), "src/lib/outcome-protection/outcome-protection.ts"), "utf8");
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/outcome-protection.ts"), "utf8");
  assert.equal(model.includes("LeftShield"), false);
  assert.equal(route.includes("LeftShield"), false);
});
