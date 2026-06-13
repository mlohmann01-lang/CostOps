import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { governedActionService } from "../lib/actions/governed-actions";
import { approvalAuthorityEngine, approveRequest, createApprovalRequest, submitApprovalRequest } from "../lib/approval-authority/approval-authority";
import { trustReadinessAuthorityService } from "../lib/trust-readiness/trust-readiness-authority";
import { createDefaultExecutionConnector } from "../lib/execution/execution-connectors";
import { governedExecutionService, type GovernedExecutionType } from "../lib/execution/governed-execution";
import { outcomeProtectionService } from "../lib/outcome-protection/outcome-protection";
import { economicOutcomeAttributionService } from "../lib/economic-outcomes/economic-outcome-attribution";
import { clearItamAssets } from "../lib/connectors/itam/itam-assets";
import { clearItamExecutionState, rollbackItamExecution, verifyItamExecution } from "../lib/connectors/itam/itam-execution";
import { getItamWedgeCertification } from "../lib/connectors/itam/itam-wedge-certification";
import { clearTenantExecutionPolicies, evaluateLiveTenantExecutionGate, getTenantExecutionPolicy, setTenantExecutionPolicy } from "../lib/runtime/live-tenant-safety";

const tenantId = "tenant-itam-wedge-test";

const playbooks = [
  ["Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE", "itam unused licence reclaim recommendation"],
  ["Duplicate Capability Consolidation", "ITAM_CONSOLIDATE_CAPABILITY", "itam duplicate capability consolidation recommendation"],
  ["Renewal Optimisation", "ITAM_CREATE_RENEWAL_REVIEW", "itam renewal optimisation recommendation"],
  ["Orphaned Asset Remediation", "ITAM_ASSIGN_OWNER", "itam orphaned asset remediation recommendation"],
  ["Hardware Retirement", "ITAM_MARK_RETIRED", "itam hardware retirement recommendation"],
] as const;

async function reset(tenant = tenantId) {
  governedExecutionService.clear();
  await governedActionService.clear();
  approvalAuthorityEngine.clear();
  trustReadinessAuthorityService.clear();
  outcomeProtectionService.clear();
  economicOutcomeAttributionService.clearForTests();
  clearItamAssets();
  clearItamExecutionState();
  clearTenantExecutionPolicies();
  return governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId: tenant, connectorType: "ITAM", executionMode: "APPROVAL_REQUIRED" }));
}

async function action(name: string, _type: GovernedExecutionType, tenant = tenantId, overrides: Record<string, unknown> = {}) {
  const sourceId = `${name.toLowerCase().replace(/\s+/g, "-")}-itam-asset`;
  return governedActionService.create({
    tenantId: tenant,
    title: name,
    description: `${name} governed ITAM cost optimisation`,
    domain: "ITAM",
    sourceType: "RECOMMENDATION",
    sourceId,
    status: "APPROVED",
    priority: "MEDIUM",
    readiness: "APPROVAL_REQUIRED",
    ownerId: "itam-owner",
    approverId: "approver",
    trustScore: 0.91,
    projectedMonthlyValue: 200,
    projectedAnnualValue: 2400,
    blastRadius: "LOW",
    rollbackCapability: "FULL",
    recommendationIds: [`rec-${sourceId}`],
    evidenceIds: [
      `discovery-itam-${sourceId}`,
      `trust-readiness-itam-${sourceId}`,
      `approval-itam-${sourceId}`,
      `executive-proof-itam-${sourceId}`,
    ],
    ...overrides,
  } as any);
}

async function approve(actionId: string, tenant = tenantId) {
  const req = await createApprovalRequest({ tenantId: tenant, actionId, approverIds: ["approver"], evidenceIds: ["approval-evidence"] });
  await submitApprovalRequest(tenant, req.id);
  await approveRequest(tenant, req.id, "approver");
}

async function execute(name: string, type: GovernedExecutionType, connectorId: string) {
  const a = await action(name, type);
  await approve(a.id);
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: a.id, connectorId, executionType: type, approved: true });
  await verifyItamExecution(tenantId, result.execution.id);
  return { a, result };
}

test("Missing ITAM execution fails certification", async () => {
  await reset();
  const cert = await getItamWedgeCertification(tenantId);
  assert.equal(cert.certified, false);
  assert.equal(cert.playbooks.find((p) => p.name === "Unused Licence Reclaim")!.execution, "NOT_IMPLEMENTED");
});

test("Missing Flexera/ITAM capabilities fails certification", async () => {
  const connector = await reset();
  governedExecutionService.registerConnector({ ...connector, capabilities: ["READ_ASSET"] });
  const a = await action("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE");
  await approve(a.id);
  await governedExecutionService.executeGovernedAction({ tenantId, actionId: a.id, connectorId: connector.id, executionType: "ITAM_RECLAIM_LICENSE", approved: true });
  const cert = await getItamWedgeCertification(tenantId);
  assert.match(cert.playbooks.find((p) => p.name === "Unused Licence Reclaim")!.blockers.join(" "), /Missing ITAM capabilities/);
});

test("Missing rollback fails certification", async () => {
  const connector = await reset();
  const a = await action("Hardware Retirement", "ITAM_MARK_RETIRED");
  await approve(a.id);
  const result = await governedExecutionService.simulateExecution({ tenantId, actionId: a.id, connectorId: connector.id, executionType: "ITAM_MARK_RETIRED" });
  governedExecutionService.updateExecution({ ...result.execution, status: "COMPLETED", executionMode: "CONTROLLED" });
  const cert = await getItamWedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((p) => p.name === "Hardware Retirement")!.rollback, "MISSING");
});

test("Missing verification fails certification", async () => {
  const connector = await reset();
  const a = await action("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE");
  await approve(a.id);
  await governedExecutionService.executeGovernedAction({ tenantId, actionId: a.id, connectorId: connector.id, executionType: "ITAM_RECLAIM_LICENSE", approved: true });
  const cert = await getItamWedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((p) => p.name === "Unused Licence Reclaim")!.verification, "MISSING");
});

for (const [name, type] of playbooks) {
  test(`${name} certifies`, async () => {
    const connector = await reset();
    await execute(name, type, connector.id);
    const cert = await getItamWedgeCertification(tenantId);
    const row = cert.playbooks.find((p) => p.name === name)!;
    assert.equal(row.certified, true, `${name} should be certified; blockers: ${row.blockers.join(", ")}`);
    assert.equal(row.execution, "CONTROLLED_EXECUTION");
  });
}

test("Pre-state evidence is captured", async () => {
  const connector = await reset();
  const { result } = await execute("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE", connector.id);
  const evidence = governedExecutionService.listEvidence(tenantId, result.execution.id);
  assert.ok(evidence.some((e) => e.evidenceType === "PRE_STATE"), "PRE_STATE evidence missing");
});

test("Post-state evidence is captured", async () => {
  const connector = await reset();
  const { result } = await execute("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE", connector.id);
  const evidence = governedExecutionService.listEvidence(tenantId, result.execution.id);
  assert.ok(evidence.some((e) => e.evidenceType === "POST_STATE"), "POST_STATE evidence missing");
});

test("Rollback payload is created", async () => {
  const connector = await reset();
  const { result } = await execute("Hardware Retirement", "ITAM_MARK_RETIRED", connector.id);
  const evidence = governedExecutionService.listEvidence(tenantId, result.execution.id);
  assert.ok(evidence.some((e) => e.evidenceType === "ROLLBACK_PAYLOAD"), "ROLLBACK_PAYLOAD missing");
});

test("Partial rollback evidence is recorded for consolidation", async () => {
  const connector = await reset();
  const { result } = await execute("Duplicate Capability Consolidation", "ITAM_CONSOLIDATE_CAPABILITY", connector.id);
  const rb = await rollbackItamExecution(tenantId, result.execution.id);
  assert.equal(rb.partial, true);
  assert.match(rb.evidence.summary, /PARTIAL/);
});

test("Verification creates economic outcome", async () => {
  const connector = await reset();
  await execute("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE", connector.id);
  const cert = await getItamWedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((p) => p.name === "Unused Licence Reclaim")!.outcome, "COMPLETE");
});

test("Verification creates protected outcome", async () => {
  const connector = await reset();
  await execute("Renewal Optimisation", "ITAM_CREATE_RENEWAL_REVIEW", connector.id);
  const cert = await getItamWedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((p) => p.name === "Renewal Optimisation")!.protection, "COMPLETE");
});

test("Drift policy is attached", async () => {
  const connector = await reset();
  await execute("Orphaned Asset Remediation", "ITAM_ASSIGN_OWNER", connector.id);
  const cert = await getItamWedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((p) => p.name === "Orphaned Asset Remediation")!.drift, "COMPLETE");
});

test("Executive proof is generated", async () => {
  const connector = await reset();
  await execute("Hardware Retirement", "ITAM_MARK_RETIRED", connector.id);
  const cert = await getItamWedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((p) => p.name === "Hardware Retirement")!.executiveProof, "COMPLETE");
});

test("Demo mode blocks writes", async () => {
  const connector = await reset();
  setTenantExecutionPolicy({ tenantId, mode: "DEMO" });
  const a = await action("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE");
  await approve(a.id);
  await assert.rejects(
    () => governedExecutionService.executeGovernedAction({ tenantId, actionId: a.id, connectorId: connector.id, executionType: "ITAM_RECLAIM_LICENSE", approved: true }),
    /DEMO|READ_ONLY/
  );
});

test("Approval blocks execution", async () => {
  const connector = await reset();
  const a = await action("Hardware Retirement", "ITAM_MARK_RETIRED");
  await assert.rejects(
    () => governedExecutionService.executeGovernedAction({ tenantId, actionId: a.id, connectorId: connector.id, executionType: "ITAM_MARK_RETIRED" }),
    /APPROVAL|READINESS/
  );
});

test("Trust blocks execution", async () => {
  const connector = await reset();
  const a = await action("Renewal Optimisation", "ITAM_CREATE_RENEWAL_REVIEW", tenantId, { trustScore: 0, evidenceIds: ["discovery-itam", "approval-itam"] });
  await approve(a.id);
  await assert.rejects(
    () => governedExecutionService.executeGovernedAction({ tenantId, actionId: a.id, connectorId: connector.id, executionType: "ITAM_CREATE_RENEWAL_REVIEW", approved: true }),
    /READINESS|TRUST|NOT_READY/
  );
});

test("Live tenant gate blocks uncertified ITAM execution", async () => {
  await reset();
  const a = await action("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE");
  const gate = evaluateLiveTenantExecutionGate({
    policy: getTenantExecutionPolicy(tenantId),
    action: a,
    wedgeCertification: { certified: false },
    request: { tenantId, domain: "ITAM", executionMode: "CONTROLLED", dryRun: false, destructive: false, blastRadius: "LOW" },
  });
  assert.equal(gate.verdict, "BLOCK_UNCERTIFIED_WEDGE");
});

test("Tenant isolation", async () => {
  const connector = await reset();
  await execute("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE", connector.id);
  const other = await getItamWedgeCertification("tenant-other-itam");
  assert.equal(other.certifiedPlaybooks, 0);
});

test("No autonomous execution", async () => {
  const connector = await reset();
  const { result } = await execute("Hardware Retirement", "ITAM_MARK_RETIRED", connector.id);
  assert.equal(
    result.evidence.every((e) => JSON.stringify(e.payload ?? {}).includes('"autonomous":true') === false),
    true
  );
});

test("No LeftShield objects", () => {
  const root = path.resolve(process.cwd(), "src");
  const files = [
    "lib/connectors/itam/itam-wedge-certification.ts",
    "lib/connectors/itam/itam-execution.ts",
    "lib/connectors/itam/itam-assets.ts",
  ].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.equal(files.includes("LeftShield"), false);
  assert.equal(files.includes("Agent Security Analytics"), false);
});

test("Full ITAM wedge certifies all five playbooks", async () => {
  const connector = await reset();
  for (const [name, type] of playbooks) await execute(name, type, connector.id);
  const cert = await getItamWedgeCertification(tenantId);
  assert.equal(cert.certified, true, `Full wedge should certify; uncertified: ${cert.playbooks.filter((p) => !p.certified).map((p) => `${p.name}: ${p.blockers.join(", ")}`).join("; ")}`);
  assert.equal(cert.certifiedPlaybooks, 5);
});
