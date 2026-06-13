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
import { clearItamExecutionState, verifyItamExecution } from "../lib/connectors/itam/itam-execution";
import { clearTenantExecutionPolicies } from "../lib/runtime/live-tenant-safety";
import { getCertifiedWedgeRegistry, getCertifiedWedgeRegistrySummary } from "../lib/certification/certified-wedge-registry";

const tenantId = "tenant-wedge-registry-test";

async function reset() {
  governedExecutionService.clear();
  await governedActionService.clear();
  approvalAuthorityEngine.clear();
  trustReadinessAuthorityService.clear();
  outcomeProtectionService.clear();
  economicOutcomeAttributionService.clearForTests();
  clearItamAssets();
  clearItamExecutionState();
  clearTenantExecutionPolicies();
}

async function makeAction(name: string, domain: string, tenant = tenantId) {
  const sourceId = `${name.toLowerCase().replace(/\s+/g, "-")}-source`;
  return governedActionService.create({
    tenantId: tenant,
    title: name,
    description: `${name} governed action`,
    domain: domain as any,
    sourceType: "RECOMMENDATION",
    sourceId,
    status: "APPROVED",
    priority: "MEDIUM",
    readiness: "APPROVAL_REQUIRED",
    ownerId: "owner",
    approverId: "approver",
    trustScore: 0.91,
    projectedMonthlyValue: 200,
    projectedAnnualValue: 2400,
    blastRadius: "LOW",
    rollbackCapability: "FULL",
    recommendationIds: [`rec-${sourceId}`],
    evidenceIds: [
      `discovery-${domain.toLowerCase()}-${sourceId}`,
      `trust-readiness-${domain.toLowerCase()}-${sourceId}`,
      `approval-${domain.toLowerCase()}-${sourceId}`,
      `executive-proof-${domain.toLowerCase()}-${sourceId}`,
    ],
  } as any);
}

async function approveAction(actionId: string, tenant = tenantId) {
  const req = await createApprovalRequest({ tenantId: tenant, actionId, approverIds: ["approver"], evidenceIds: ["approval-evidence"] });
  await submitApprovalRequest(tenant, req.id);
  await approveRequest(tenant, req.id, "approver");
}

async function executeItam(name: string, type: GovernedExecutionType, connector: any) {
  const a = await makeAction(name, "ITAM");
  await approveAction(a.id);
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: a.id, connectorId: connector.id, executionType: type, approved: true });
  await verifyItamExecution(tenantId, result.execution.id);
}

test("Registry aggregates all seven wedges", async () => {
  await reset();
  const registry = await getCertifiedWedgeRegistry(tenantId);
  assert.equal(registry.length, 7);
  const wedgeIds = registry.map((w) => w.wedgeId);
  for (const id of ["m365", "ai", "servicenow", "data-platform", "aws", "azure", "itam"]) {
    assert.ok(wedgeIds.includes(id), `Missing wedge: ${id}`);
  }
});

test("M365 normalizes correctly", async () => {
  await reset();
  const registry = await getCertifiedWedgeRegistry(tenantId);
  const m365 = registry.find((w) => w.wedgeId === "m365")!;
  assert.equal(m365.domain, "M365");
  assert.equal(m365.certificationSource, "m365-wedge-certification");
  assert.ok(["CERTIFIED", "NOT_CERTIFIED", "PARTIAL"].includes(m365.status));
  assert.ok(typeof m365.certifiedPlaybooks === "number");
  assert.ok(typeof m365.totalPlaybooks === "number");
  assert.ok(Array.isArray(m365.playbooks));
  assert.ok(Array.isArray(m365.blockers));
});

test("AI normalizes correctly", async () => {
  await reset();
  const registry = await getCertifiedWedgeRegistry(tenantId);
  const ai = registry.find((w) => w.wedgeId === "ai")!;
  assert.equal(ai.domain, "AI");
  assert.equal(ai.certificationSource, "ai-wedge-certification");
  assert.ok(Array.isArray(ai.playbooks));
  assert.ok(Array.isArray(ai.blockers));
});

test("ServiceNow normalizes correctly", async () => {
  await reset();
  const registry = await getCertifiedWedgeRegistry(tenantId);
  const sn = registry.find((w) => w.wedgeId === "servicenow")!;
  assert.equal(sn.domain, "SERVICENOW");
  assert.equal(sn.certificationSource, "servicenow-wedge-certification");
  assert.ok(Array.isArray(sn.playbooks));
});

test("Data Platform normalizes correctly", async () => {
  await reset();
  const registry = await getCertifiedWedgeRegistry(tenantId);
  const dp = registry.find((w) => w.wedgeId === "data-platform")!;
  assert.equal(dp.domain, "DATA_PLATFORM");
  assert.equal(dp.certificationSource, "data-platform-wedge-certification");
  assert.ok(Array.isArray(dp.playbooks));
});

test("AWS normalizes correctly", async () => {
  await reset();
  const registry = await getCertifiedWedgeRegistry(tenantId);
  const aws = registry.find((w) => w.wedgeId === "aws")!;
  assert.equal(aws.domain, "AWS");
  assert.equal(aws.certificationSource, "aws-wedge-certification");
  assert.ok(Array.isArray(aws.playbooks));
});

test("Azure normalizes correctly", async () => {
  await reset();
  const registry = await getCertifiedWedgeRegistry(tenantId);
  const azure = registry.find((w) => w.wedgeId === "azure")!;
  assert.equal(azure.domain, "AZURE");
  assert.equal(azure.certificationSource, "azure-wedge-certification");
  assert.ok(Array.isArray(azure.playbooks));
});

test("ITAM/Flexera normalizes correctly", async () => {
  await reset();
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "ITAM", executionMode: "APPROVAL_REQUIRED" }));
  await executeItam("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE", connector);
  await executeItam("Duplicate Capability Consolidation", "ITAM_CONSOLIDATE_CAPABILITY", connector);
  await executeItam("Renewal Optimisation", "ITAM_CREATE_RENEWAL_REVIEW", connector);
  await executeItam("Orphaned Asset Remediation", "ITAM_ASSIGN_OWNER", connector);
  await executeItam("Hardware Retirement", "ITAM_MARK_RETIRED", connector);
  const registry = await getCertifiedWedgeRegistry(tenantId);
  const itam = registry.find((w) => w.wedgeId === "itam")!;
  assert.equal(itam.domain, "ITAM");
  assert.equal(itam.certificationSource, "itam-wedge-certification");
  assert.equal(itam.status, "CERTIFIED");
  assert.equal(itam.certifiedPlaybooks, 5);
  assert.equal(itam.executionClass, "CONTROLLED_EXECUTION");
  assert.ok(itam.discoveryComplete);
  assert.ok(itam.trustComplete);
  assert.ok(itam.approvalComplete);
  assert.ok(itam.executionComplete);
  assert.ok(itam.verificationComplete);
  assert.ok(itam.outcomeComplete);
  assert.ok(itam.protectionComplete);
  assert.ok(itam.driftComplete);
  assert.ok(itam.executiveProofComplete);
});

test("Summary counts certified wedges and certified playbooks", async () => {
  await reset();
  const summary = await getCertifiedWedgeRegistrySummary(tenantId);
  assert.equal(summary.totalWedges, 7);
  assert.ok(typeof summary.certifiedWedges === "number");
  assert.ok(typeof summary.certifiedPlaybooks === "number");
  assert.ok(typeof summary.totalPlaybooks === "number");
  assert.ok(summary.certifiedWedges + summary.partialWedges + summary.notCertifiedWedges === summary.totalWedges);
  assert.ok(Array.isArray(summary.blockers));
  assert.ok(Array.isArray(summary.wedges));
  assert.equal(summary.wedges.length, 7);
});

test("Simulated-only wedge cannot be certified", async () => {
  await reset();
  const registry = await getCertifiedWedgeRegistry(tenantId);
  for (const wedge of registry) {
    if (wedge.executionClass === "SIMULATED_ONLY") {
      assert.notEqual(wedge.status, "CERTIFIED", `Simulated-only wedge ${wedge.wedgeId} should not be certified`);
    }
  }
});

test("Registry exposes blockers", async () => {
  await reset();
  const summary = await getCertifiedWedgeRegistrySummary(tenantId);
  assert.ok(Array.isArray(summary.blockers));
  const uncertified = summary.wedges.filter((w) => w.status !== "CERTIFIED");
  for (const wedge of uncertified) {
    if (wedge.totalPlaybooks > 0) {
      assert.ok(wedge.blockers.length > 0 || wedge.certifiedPlaybooks === 0, `Uncertified wedge ${wedge.wedgeId} should have blockers`);
    }
  }
});

test("Tenant isolation", async () => {
  await reset();
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "ITAM", executionMode: "APPROVAL_REQUIRED" }));
  await executeItam("Unused Licence Reclaim", "ITAM_RECLAIM_LICENSE", connector);
  const other = await getCertifiedWedgeRegistry("tenant-other-registry");
  const otherItam = other.find((w) => w.wedgeId === "itam")!;
  assert.equal(otherItam.certifiedPlaybooks, 0);
});

test("Live tenant readiness consumes registry summary", async () => {
  await reset();
  const summary = await getCertifiedWedgeRegistrySummary(tenantId);
  assert.ok(typeof summary.certifiedWedges === "number");
  assert.ok(typeof summary.totalWedges === "number");
  assert.ok(typeof summary.productionReadyWedges === "number");
  assert.ok(Array.isArray(summary.blockers));
  assert.ok(summary.certifiedWedges >= 0);
  assert.ok(summary.productionReadyWedges >= 0);
  assert.ok(summary.productionReadyWedges <= summary.certifiedWedges);
});

test("No LeftShield labels", () => {
  const root = path.resolve(process.cwd(), "src");
  const files = [
    "lib/certification/certified-wedge-registry.ts",
    "routes/certification.ts",
  ].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.equal(files.includes("LeftShield"), false);
  assert.equal(files.includes("Agent Security Analytics"), false);
});
