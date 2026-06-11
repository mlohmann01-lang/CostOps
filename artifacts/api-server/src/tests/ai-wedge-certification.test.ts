import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { governedActionService } from "../lib/actions/governed-actions";
import { approvalAuthorityEngine, createApprovalRequest, submitApprovalRequest, approveRequest } from "../lib/approval-authority/approval-authority";
import { trustReadinessAuthorityService } from "../lib/trust-readiness/trust-readiness-authority";
import { createDefaultExecutionConnector } from "../lib/execution/execution-connectors";
import { governedExecutionService, type GovernedExecutionType } from "../lib/execution/governed-execution";
import { outcomeProtectionService } from "../lib/outcome-protection/outcome-protection";
import { economicOutcomeAttributionService } from "../lib/economic-outcomes/economic-outcome-attribution";
import { aiIntelligenceRepository, aiIntelligenceService } from "../lib/ai-economic-control/ai-intelligence";
import { clearAIProviderExecutionState, configureAIProviderExecution, rollbackAIExecution, verifyAIExecution } from "../lib/ai-economic-control/ai-provider-execution";
import { getAIWedgeCertification } from "../lib/ai-economic-control/ai-wedge-certification";

const tenantId = "tenant-ai-wedge-test";

async function reset(tenant = tenantId) {
  governedExecutionService.clear();
  await governedActionService.clear();
  approvalAuthorityEngine.clear();
  trustReadinessAuthorityService.clear();
  outcomeProtectionService.clear();
  economicOutcomeAttributionService.clearForTests();
  aiIntelligenceRepository.clearForTests();
  clearAIProviderExecutionState();
  for (const provider of ["OpenAI", "Anthropic", "GitHub Copilot", "Microsoft Copilot", "Cursor", "Gemini Enterprise", "Claude Teams", "Custom MCP Servers"]) configureAIProviderExecution(provider, { mode: "PRODUCTION" });
  return governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId: tenant, connectorType: "AI", executionMode: "APPROVAL_REQUIRED" }));
}

async function createAsset(assetId = "aiasset-openai", vendor = "OpenAI") {
  const asset = aiIntelligenceService.createAsset(tenantId, { id: assetId, name: `${vendor} governed AI asset`, assetType: vendor === "Custom MCP Servers" ? "MCP_SERVER" : "AGENT", vendor, status: "ACTIVE", approvalStatus: "APPROVED", ownerId: "ai-owner", department: "AI", costCentre: "CC-AI", source: "CONNECTOR", sourceSystem: vendor });
  aiIntelligenceService.ingestUsage(tenantId, { assetId: asset.id, requestCount: 10, executionCount: 3, userCount: 2, source: vendor });
  aiIntelligenceService.ingestSpend(tenantId, { assetId: asset.id, totalSpend: 1000, source: vendor });
  return asset;
}

async function createAction(assetId: string, executionType: GovernedExecutionType, overrides: Record<string, unknown> = {}) {
  return governedActionService.create({
    tenantId,
    title: `AI action ${executionType}`,
    description: `Governed ${executionType} for ${assetId}`,
    domain: "AI",
    sourceType: "RECOMMENDATION",
    sourceId: assetId,
    status: "APPROVED",
    priority: "MEDIUM",
    readiness: "APPROVAL_REQUIRED",
    ownerId: "new-ai-owner",
    approverId: "ai-approver",
    trustScore: 0.91,
    projectedMonthlyValue: 100,
    projectedAnnualValue: 1200,
    blastRadius: "LOW",
    rollbackCapability: executionType === "APPROVE_AI_ASSET" ? "NONE" : "FULL",
    recommendationIds: [`rec-${assetId}-${executionType}`],
    evidenceIds: [`discovery-${assetId}`, `identity-${assetId}`, `usage-${assetId}`, `financial-${assetId}`, `trust-readiness-${assetId}`, `approval-${assetId}`, `execution-plan-${assetId}`, `rollback-plan-${assetId}`, `executive-proof-${assetId}`],
    ...overrides,
  } as any);
}

async function approveAction(actionId: string) {
  const request = await createApprovalRequest({ tenantId, actionId, approverIds: ["ai-approver"], evidenceIds: ["approval-evidence"] });
  await submitApprovalRequest(tenantId, request.id);
  await approveRequest(tenantId, request.id, "ai-approver");
}

async function executeAndVerify(assetId: string, executionType: GovernedExecutionType, connectorId: string, vendor = "OpenAI") {
  const asset = await createAsset(assetId, vendor);
  const action = await createAction(asset.id, executionType);
  await approveAction(action.id);
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId, executionType, approved: true, ownerId: "new-ai-owner", policyId: "policy-ai-cost" });
  const verified = await verifyAIExecution(tenantId, result.execution.id);
  return { asset, action, result, verified };
}

test("discovery, trust, approval, execution, rollback, and verification are required", async () => {
  const connector = await reset();
  let cert = await getAIWedgeCertification(tenantId);
  assert.equal(cert.certifications.length, 0);
  const asset = await createAsset("aiasset-required", "OpenAI");
  cert = await getAIWedgeCertification(tenantId);
  assert.equal(cert.certifications[0].discovery, "COMPLETE");
  assert.equal(cert.certifications[0].trust, "MISSING");
  const noApproval = await createAction(asset.id, "RETIRE_AI_ASSET", { status: "READY", evidenceIds: ["discovery-aiasset-required", "trust-readiness-aiasset-required"] });
  cert = await getAIWedgeCertification(tenantId);
  assert.equal(cert.certifications[0].approval, "MISSING");
  await approveAction(noApproval.id);
  await governedExecutionService.executeGovernedAction({ tenantId, actionId: noApproval.id, connectorId: connector.id, executionType: "RETIRE_AI_ASSET", approved: true });
  cert = await getAIWedgeCertification(tenantId);
  assert.equal(cert.certifications[0].execution, "CONTROLLED_EXECUTION");
  assert.equal(cert.certifications[0].verification, "MISSING");
});

test("certification fails with a missing lifecycle step and succeeds with complete lifecycle", async () => {
  const connector = await reset();
  await createAsset("aiasset-incomplete", "Anthropic");
  let cert = await getAIWedgeCertification(tenantId);
  assert.equal(cert.certifications.find((row) => row.assetId === "aiasset-incomplete")!.certified, false);
  await executeAndVerify("aiasset-complete", "RETIRE_AI_ASSET", connector.id, "OpenAI");
  cert = await getAIWedgeCertification(tenantId);
  const complete = cert.certifications.find((row) => row.assetId === "aiasset-complete")!;
  assert.equal(complete.certified, true);
  assert.equal(complete.rollback, "COMPLETE");
  assert.equal(complete.outcome, "COMPLETE");
  assert.equal(complete.protection, "COMPLETE");
  assert.equal(complete.drift, "COMPLETE");
  assert.equal(complete.executiveProof, "COMPLETE");
});

test("provider execution supports approval, retirement, owner assignment, policy enforcement, disabling, and enabling", async () => {
  const connector = await reset();
  const cases: Array<[string, GovernedExecutionType, string]> = [["aiasset-approve", "APPROVE_AI_ASSET", "GitHub Copilot"], ["aiasset-retire", "RETIRE_AI_ASSET", "Microsoft Copilot"], ["aiasset-owner", "ASSIGN_AI_OWNER", "Cursor"], ["aiasset-policy", "ENFORCE_AI_POLICY", "Gemini Enterprise"], ["aiasset-disable", "DISABLE_AI_ASSET", "Claude Teams"], ["aiasset-enable", "ENABLE_AI_ASSET", "Custom MCP Servers"]];
  for (const [assetId, type, vendor] of cases) await executeAndVerify(assetId, type, connector.id, vendor);
  const cert = await getAIWedgeCertification(tenantId);
  for (const [assetId] of cases) assert.equal(cert.certifications.find((row) => row.assetId === assetId)!.certified, true);
});

test("rollback restores AI provider state", async () => {
  const connector = await reset();
  const { asset, result } = await executeAndVerify("aiasset-rollback", "DISABLE_AI_ASSET", connector.id, "Anthropic");
  assert.equal(aiIntelligenceService.getAsset(tenantId, asset.id)?.status, "BLOCKED");
  const rollback = await rollbackAIExecution(tenantId, result.execution.id);
  assert.equal(rollback.verified.passed, true);
  assert.equal(aiIntelligenceService.getAsset(tenantId, asset.id)?.status, "ACTIVE");
});

test("demo mode blocks execution, approval authority blocks missing approval, trust blocks denied actions, and tenant isolation holds", async () => {
  const connector = await reset();
  configureAIProviderExecution("OpenAI", { mode: "DEMO" });
  const demoAsset = await createAsset("aiasset-demo", "OpenAI");
  const demoAction = await createAction(demoAsset.id, "DISABLE_AI_ASSET");
  await approveAction(demoAction.id);
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: demoAction.id, connectorId: connector.id, executionType: "DISABLE_AI_ASSET", approved: true }), /DEMO_MODE/);
  configureAIProviderExecution("OpenAI", { mode: "PRODUCTION" });
  const approvalAction = await createAction(demoAsset.id, "DISABLE_AI_ASSET", { status: "READY" });
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: approvalAction.id, connectorId: connector.id, executionType: "DISABLE_AI_ASSET", approved: false }), /APPROVAL/);
  const trustAction = await createAction(demoAsset.id, "DISABLE_AI_ASSET", { trustScore: 0, readiness: "ELIGIBLE" });
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: trustAction.id, connectorId: connector.id, executionType: "DISABLE_AI_ASSET", approved: true }), /READINESS|EXECUTION_NOT_READY/);
  assert.equal((await getAIWedgeCertification("other-tenant")).certifications.length, 0);
});

test("AI wedge implementation is governed and contains no out-of-scope security objects", () => {
  const provider = fs.readFileSync(path.join(process.cwd(), "src/lib/ai-economic-control/ai-provider-execution.ts"), "utf8");
  const cert = fs.readFileSync(path.join(process.cwd(), "src/lib/ai-economic-control/ai-wedge-certification.ts"), "utf8");
  assert.equal(provider.includes("autonomous: false"), true);
  assert.equal(provider.includes("LeftShield"), false);
  assert.equal(cert.includes("LeftShield"), false);
});

test("protected outcome is created for verified AI execution", async () => {
  const connector = await reset();
  const { verified } = await executeAndVerify("aiasset-protected-specific", "RETIRE_AI_ASSET", connector.id, "OpenAI");
  assert.ok(verified.protectedOutcome);
});

test("drift policy is attached to protected AI outcome", async () => {
  const connector = await reset();
  const { verified } = await executeAndVerify("aiasset-drift-specific", "ENFORCE_AI_POLICY", connector.id, "Gemini Enterprise");
  assert.equal(Boolean(verified.protectedOutcome && verified.protectedOutcome.policyIds.length >= 5), true);
});

test("executive proof is generated for certified AI asset", async () => {
  const connector = await reset();
  await executeAndVerify("aiasset-proof-specific", "ASSIGN_AI_OWNER", connector.id, "Cursor");
  const cert = await getAIWedgeCertification(tenantId);
  assert.equal(cert.certifications.find((row) => row.assetId === "aiasset-proof-specific")!.executiveProof, "COMPLETE");
});

test("certification fails with missing lifecycle step", async () => {
  await reset();
  await createAsset("aiasset-missing-step", "Anthropic");
  const cert = await getAIWedgeCertification(tenantId);
  assert.equal(cert.certifications.find((row) => row.assetId === "aiasset-missing-step")!.certified, false);
});

test("certification succeeds with complete lifecycle", async () => {
  const connector = await reset();
  await executeAndVerify("aiasset-success-specific", "DISABLE_AI_ASSET", connector.id, "Claude Teams");
  const cert = await getAIWedgeCertification(tenantId);
  assert.equal(cert.certifications.find((row) => row.assetId === "aiasset-success-specific")!.certified, true);
});

test("demo mode blocks AI provider execution", async () => {
  const connector = await reset();
  configureAIProviderExecution("OpenAI", { mode: "DEMO" });
  const asset = await createAsset("aiasset-demo-specific", "OpenAI");
  const action = await createAction(asset.id, "DISABLE_AI_ASSET");
  await approveAction(action.id);
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "DISABLE_AI_ASSET", approved: true }), /DEMO_MODE/);
});

test("AI certification is tenant isolated", async () => {
  const connector = await reset();
  await executeAndVerify("aiasset-tenant-specific", "RETIRE_AI_ASSET", connector.id, "OpenAI");
  assert.equal((await getAIWedgeCertification("other-tenant")).certifications.length, 0);
});

test("AI provider execution is not autonomous", () => {
  const provider = fs.readFileSync(path.join(process.cwd(), "src/lib/ai-economic-control/ai-provider-execution.ts"), "utf8");
  assert.equal(provider.includes("autonomous: false"), true);
});

test("AI wedge certification contains no LeftShield objects", () => {
  const cert = fs.readFileSync(path.join(process.cwd(), "src/lib/ai-economic-control/ai-wedge-certification.ts"), "utf8");
  assert.equal(cert.includes("LeftShield"), false);
});
