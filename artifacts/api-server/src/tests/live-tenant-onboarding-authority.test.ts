import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  evaluateTenantOnboardingAuthority,
  getTenantNextActions,
  evaluateFirstOutcomeReadiness,
  getTenantOnboardingAuthoritySummary,
  getLiveTenantOnboardingAuthorityStatus,
  type OnboardingStage,
} from "../lib/onboarding/live-tenant-onboarding-authority";

const TENANT_A = "tenant-onboarding-test-a";
const TENANT_B = "tenant-onboarding-test-b";

const EXPECTED_STAGES: OnboardingStage[] = [
  "DISCOVER", "CONNECT", "VALIDATE", "TRUST", "READINESS",
  "CERTIFY", "EXECUTE", "VERIFY", "PROTECT", "PROVE",
];

test("1. evaluateTenantOnboardingAuthority returns all 10 stages", async () => {
  const authority = await evaluateTenantOnboardingAuthority(TENANT_A);
  assert.equal(authority.stages.length, 10);
  for (const stage of EXPECTED_STAGES) {
    assert.ok(authority.stages.some((s) => s.stage === stage), `Missing stage: ${stage}`);
  }
});

test("2. Authority result has required shape fields", async () => {
  const authority = await evaluateTenantOnboardingAuthority(TENANT_A);
  assert.ok(authority.id, "Must have id");
  assert.equal(authority.tenantId, TENANT_A);
  assert.ok(authority.currentStage, "Must have currentStage");
  assert.ok(authority.overallStatus, "Must have overallStatus");
  assert.equal(typeof authority.progressPercent, "number");
  assert.equal(typeof authority.readinessScore, "number");
  assert.equal(typeof authority.trustScore, "number");
  assert.ok(Array.isArray(authority.blockers));
  assert.ok(authority.generatedAt);
  assert.equal(authority.stages.length, 10);
});

test("3. readinessScore is between 0 and 100", async () => {
  const authority = await evaluateTenantOnboardingAuthority(TENANT_A);
  assert.ok(authority.readinessScore >= 0, "readinessScore must be >= 0");
  assert.ok(authority.readinessScore <= 100, "readinessScore must be <= 100");
});

test("4. progressPercent reflects completed stages", async () => {
  const authority = await evaluateTenantOnboardingAuthority(TENANT_A);
  const completedCount = authority.stages.filter((s) => s.completed).length;
  assert.equal(authority.progressPercent, Math.round((completedCount / 10) * 100));
});

test("5. overallStatus is one of the valid values", async () => {
  const authority = await evaluateTenantOnboardingAuthority(TENANT_A);
  const valid = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "READY_FOR_PILOT", "READY_FOR_PRODUCTION", "COMPLETE"];
  assert.ok(valid.includes(authority.overallStatus), `Invalid overallStatus: ${authority.overallStatus}`);
});

test("6. Each stage has required fields", async () => {
  const authority = await evaluateTenantOnboardingAuthority(TENANT_A);
  for (const stage of authority.stages) {
    assert.ok(stage.stage, "Missing stage name");
    assert.ok(stage.status, "Missing stage status");
    assert.equal(typeof stage.score, "number");
    assert.equal(typeof stage.completed, "boolean");
    assert.ok(Array.isArray(stage.requiredActions));
    assert.ok(Array.isArray(stage.blockers));
    assert.ok(Array.isArray(stage.evidenceIds));
  }
});

test("7. getTenantNextActions returns array of prioritised actions", async () => {
  const actions = await getTenantNextActions(TENANT_A);
  assert.ok(Array.isArray(actions));
  for (const action of actions) {
    assert.ok(action.priority, "Missing priority");
    assert.ok(action.title, "Missing title");
    assert.ok(action.description, "Missing description");
    assert.ok(action.stage, "Missing stage");
    assert.ok(action.actionType, "Missing actionType");
  }
});

test("8. Next actions are sorted by ascending priority", async () => {
  const actions = await getTenantNextActions(TENANT_A);
  for (let i = 1; i < actions.length; i++) {
    assert.ok(actions[i].priority >= actions[i - 1].priority, "Actions not sorted by priority");
  }
});

test("9. evaluateFirstOutcomeReadiness returns correct shape", async () => {
  const readiness = await evaluateFirstOutcomeReadiness(TENANT_A);
  assert.equal(typeof readiness.ready, "boolean");
  assert.ok(Array.isArray(readiness.firstExecutableActions));
  assert.equal(typeof readiness.projectedValue, "number");
  assert.ok(Array.isArray(readiness.requiredApprovals));
  assert.ok(Array.isArray(readiness.trustIssues));
  assert.ok(Array.isArray(readiness.readinessIssues));
});

test("10. getTenantOnboardingAuthoritySummary returns summary fields", async () => {
  const summary = await getTenantOnboardingAuthoritySummary(TENANT_A);
  assert.equal(typeof summary.tenantsReadyForPilot, "number");
  assert.equal(typeof summary.tenantsReadyForProduction, "number");
  assert.equal(typeof summary.blockedTenants, "number");
  assert.equal(typeof summary.averageReadinessScore, "number");
  assert.equal(typeof summary.averageTrustScore, "number");
  assert.equal(typeof summary.averageProgressPercent, "number");
  assert.ok(Array.isArray(summary.commonBlockers));
  assert.equal(typeof summary.firstOutcomeReadyTenants, "number");
});

test("11. Tenant isolation — two tenants produce independent results", async () => {
  const [a, b] = await Promise.all([
    evaluateTenantOnboardingAuthority(TENANT_A),
    evaluateTenantOnboardingAuthority(TENANT_B),
  ]);
  assert.equal(a.tenantId, TENANT_A);
  assert.equal(b.tenantId, TENANT_B);
  assert.notEqual(a.id, b.id);
});

test("12. getLiveTenantOnboardingAuthorityStatus returns platform authority registry entry", () => {
  const status = getLiveTenantOnboardingAuthorityStatus();
  assert.equal(status.authorityId, "live-tenant-onboarding-authority");
  assert.equal(status.type, "PLATFORM_AUTHORITY");
  assert.ok(["CERTIFIED", "PARTIAL", "NOT_CERTIFIED"].includes(status.status));
  assert.equal(typeof status.certificationRequirements.authorityEvaluationExists, "boolean");
  assert.equal(typeof status.certificationRequirements.readinessScoringExists, "boolean");
  assert.equal(typeof status.certificationRequirements.firstOutcomeReadinessExists, "boolean");
  assert.equal(typeof status.certificationRequirements.uiAvailable, "boolean");
  assert.equal(typeof status.certificationRequirements.apiAvailable, "boolean");
  assert.equal(typeof status.certificationRequirements.nextActionEngineExists, "boolean");
});

test("13. No LeftShield or Agent Security Analytics in implementation file", () => {
  const filePath = path.resolve(process.cwd(), "src/lib/onboarding/live-tenant-onboarding-authority.ts");
  const source = fs.readFileSync(filePath, "utf8");
  assert.equal(source.includes("LeftShield"), false, "Must not contain LeftShield");
  assert.equal(source.toLowerCase().includes("agent security analytics"), false, "Must not contain Agent Security Analytics");
});
