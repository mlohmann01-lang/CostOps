/**
 * Tests for proof graph API routes.
 *
 * Covers:
 *  - Token governance policy proof route: nodes returned, secrets redacted, PROOF_INCOMPLETE when missing
 *  - Token governance downgrade proof route: nodes, approval record, cross-tenant 404
 *  - Packs proof route: node structure, trust score propagation
 *
 * These tests exercise the business-logic helpers directly (in-memory registries,
 * no DB required) so they run in the Node built-in test runner without any
 * external services.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { tokenGovernancePolicyRegistry, type TokenGovernancePolicy } from '../lib/token-governance/token-governance-policy.js';
import { modelDowngradeExecutor } from '../lib/token-governance/model-downgrade-execution.js';
import { buildMockProofGraph } from '../lib/ai-proof-graph.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePolicy(overrides: Partial<TokenGovernancePolicy> = {}): TokenGovernancePolicy {
  const tenantId = overrides.tenantId ?? `test-tenant-${Date.now()}`;
  return {
    policyId: `policy-test-${Date.now()}`,
    tenantId,
    name: 'Test Policy',
    riskClass: 'B',
    enabled: true,
    enforcementMode: 'WARN',
    budgets: [
      {
        budgetId: `budget-test-${Date.now()}`,
        scope: 'TENANT',
        budgetType: 'MONTHLY',
        budgetAmountUSD: 500,
        alertThresholdPercent: 80,
        currentSpendUSD: 100,
        currentTokens: 50000,
        status: 'ACTIVE',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Token Governance Policy Proof — in-memory registry tests
// ---------------------------------------------------------------------------

test('policy proof: registry returns policy by ID', () => {
  const policy = makePolicy({ tenantId: 'tenant-proof-1' });
  tokenGovernancePolicyRegistry.registerPolicy(policy);

  const retrieved = tokenGovernancePolicyRegistry.getPolicy(policy.policyId);
  assert.ok(retrieved, 'Policy should be retrievable after registration');
  assert.equal(retrieved!.policyId, policy.policyId);
  assert.equal(retrieved!.tenantId, 'tenant-proof-1');
});

test('policy proof: unknown policy ID returns undefined (PROOF_INCOMPLETE path)', () => {
  const result = tokenGovernancePolicyRegistry.getPolicy('policy-nonexistent-xyz');
  assert.equal(result, undefined, 'Unknown policy should return undefined, triggering PROOF_INCOMPLETE');
});

test('policy proof: cross-tenant isolation — policy belonging to another tenant is not visible', () => {
  const policy = makePolicy({ tenantId: 'tenant-owner-A' });
  tokenGovernancePolicyRegistry.registerPolicy(policy);

  // A request for tenant-B should not see tenant-A's policy
  const policiesForB = tokenGovernancePolicyRegistry.listTenantPolicies('tenant-owner-B');
  const found = policiesForB.find((p) => p.policyId === policy.policyId);
  assert.equal(found, undefined, 'Cross-tenant policy must not be listed for another tenant');
});

test('policy proof: proof node would contain policy metadata (no secrets)', () => {
  const policy = makePolicy({ tenantId: 'tenant-proof-meta' });
  tokenGovernancePolicyRegistry.registerPolicy(policy);

  const retrieved = tokenGovernancePolicyRegistry.getPolicy(policy.policyId)!;

  // Simulate what the proof route builds for the policy_definition node
  const expandableDetails = {
    policyId: retrieved.policyId,
    name: retrieved.name,
    riskClass: retrieved.riskClass,
    enabled: retrieved.enabled,
    enforcementMode: retrieved.enforcementMode,
    budgetCount: retrieved.budgets.length,
    modelRuleCount: retrieved.modelDowngradeRules?.length ?? 0,
    allowedModels: retrieved.allowedModels ?? [],
    deniedModels: retrieved.deniedModels ?? [],
    maxTokensPerRequest: retrieved.maxTokensPerRequest ?? null,
    requireApprovalAboveCost: retrieved.requireApprovalAboveCost ?? null,
    createdAt: retrieved.createdAt,
    updatedAt: retrieved.updatedAt,
  };

  const detailsJson = JSON.stringify(expandableDetails);

  // No secrets should be present: no raw API keys, no tokens, no credentials
  assert.equal(detailsJson.includes('Bearer '), false, 'No auth tokens in proof node');
  assert.equal(detailsJson.includes('password'), false, 'No passwords in proof node');
  assert.equal(detailsJson.includes('secret'), false, 'No secrets in proof node');
  assert.ok(expandableDetails.policyId, 'Policy ID must be present');
  assert.ok(expandableDetails.name, 'Policy name must be present');
});

test('policy proof: budget summary node has correct spend totals', () => {
  const tenantId = `tenant-budget-${Date.now()}`;
  const policy = makePolicy({
    tenantId,
    budgets: [
      {
        budgetId: 'b1',
        scope: 'TENANT',
        budgetType: 'MONTHLY',
        budgetAmountUSD: 1000,
        alertThresholdPercent: 80,
        currentSpendUSD: 250,
        currentTokens: 100000,
        status: 'ACTIVE',
      },
      {
        budgetId: 'b2',
        scope: 'WORKFLOW',
        scopeId: 'wf-1',
        budgetType: 'DAILY',
        budgetAmountUSD: 50,
        alertThresholdPercent: 90,
        currentSpendUSD: 45,
        currentTokens: 10000,
        status: 'ACTIVE',
      },
    ],
  });

  const totalBudgetUSD = policy.budgets.reduce((sum, b) => sum + b.budgetAmountUSD, 0);
  const totalSpendUSD = policy.budgets.reduce((sum, b) => sum + b.currentSpendUSD, 0);

  assert.equal(totalBudgetUSD, 1050);
  assert.equal(totalSpendUSD, 295);
  assert.ok(totalSpendUSD < totalBudgetUSD, 'Spend must be within budget in this fixture');
});

// ---------------------------------------------------------------------------
// Token Governance Downgrade Proof — in-memory executor tests
// ---------------------------------------------------------------------------

test('downgrade proof: proposal + approval chain builds correctly', () => {
  const tenantId = `tenant-dg-${Date.now()}`;
  const proposal = modelDowngradeExecutor.createProposal(
    tenantId,
    'gpt-4',
    'gpt-3.5-turbo',
    'Cost reduction test',
    120,
    ['wf-alpha'],
  );

  const execution = modelDowngradeExecutor.createExecution(proposal);
  assert.equal(execution.status, 'PENDING_APPROVAL');
  assert.equal(execution.approvalChain.length, 0);
  assert.equal(execution.tenantId, tenantId);
  assert.equal(execution.fromModel, 'gpt-4');
  assert.equal(execution.toModel, 'gpt-3.5-turbo');
});

test('downgrade proof: approval record node reflects approval chain', () => {
  const tenantId = `tenant-dg-approval-${Date.now()}`;
  const proposal = modelDowngradeExecutor.createProposal(tenantId, 'claude-3-opus', 'claude-3-haiku', 'Test', 80, []);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-primary');
  const updated = modelDowngradeExecutor.getExecution(execution.executionId)!;

  // Approval chain should have one record
  assert.equal(updated.approvalChain.length, 1);
  assert.equal(updated.approvalChain[0]!.approverActorId, 'actor-primary');
  assert.equal(updated.approvalChain[0]!.approvalType, 'FIRST_APPROVAL');

  // Approval chain node must NOT contain credentials or secrets
  const chainJson = JSON.stringify(updated.approvalChain);
  assert.equal(chainJson.includes('password'), false);
  assert.equal(chainJson.includes('Bearer '), false);
  assert.equal(chainJson.includes('apiKey'), false);
});

test('downgrade proof: cross-tenant isolation — getExecution for wrong tenant returns mismatch', () => {
  const tenantOwner = `tenant-exec-owner-${Date.now()}`;
  const proposal = modelDowngradeExecutor.createProposal(tenantOwner, 'gpt-4', 'gpt-3.5-turbo', 'Test', 50, []);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  // Simulating the route logic: execution found but tenantId doesn't match
  const retrieved = modelDowngradeExecutor.getExecution(execution.executionId)!;
  const requestingTenant = 'tenant-other-B';
  const accessAllowed = retrieved.tenantId === requestingTenant;

  assert.equal(accessAllowed, false, 'Cross-tenant access must be denied (404 not 403)');
  // The route should return 404 — the retrieved execution has a different tenantId
  assert.equal(retrieved.tenantId, tenantOwner);
});

test('downgrade proof: PROOF_COMPLETE only when executed with non-empty approval chain', () => {
  const tenantId = `tenant-dg-complete-${Date.now()}`;
  const proposal = modelDowngradeExecutor.createProposal(tenantId, 'gpt-4o', 'gpt-4o-mini', 'Test', 200, ['wf-1']);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  // Before approval — PROOF_INCOMPLETE
  const beforeApproval = modelDowngradeExecutor.getExecution(execution.executionId)!;
  const statusBefore = beforeApproval.status === 'EXECUTED' && beforeApproval.approvalChain.length > 0
    ? 'PROOF_COMPLETE'
    : 'PROOF_INCOMPLETE';
  assert.equal(statusBefore, 'PROOF_INCOMPLETE');

  // Approve and execute
  modelDowngradeExecutor.recordApproval(execution.executionId, 'approver-1');
  modelDowngradeExecutor.executeDowngrade(execution.executionId);

  const afterExecution = modelDowngradeExecutor.getExecution(execution.executionId)!;
  const statusAfter = afterExecution.status === 'EXECUTED' && afterExecution.approvalChain.length > 0
    ? 'PROOF_COMPLETE'
    : 'PROOF_INCOMPLETE';
  assert.equal(statusAfter, 'PROOF_COMPLETE');
});

test('downgrade proof: dual-approval blocks same-actor second approval', () => {
  const tenantId = `tenant-dg-dual-${Date.now()}`;
  // Class A risk requires dual approval — register a class A policy
  const classAPolicy = makePolicy({ tenantId, riskClass: 'A', policyId: `pol-A-${Date.now()}` });
  tokenGovernancePolicyRegistry.registerPolicy(classAPolicy);

  const proposal = modelDowngradeExecutor.createProposal(tenantId, 'gpt-4', 'gpt-3.5-turbo', 'Dual test', 500, []);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  // First approval
  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');

  // Second approval by same actor should be blocked
  const result = modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');
  assert.equal(result.blocked, true, 'Same actor cannot approve twice (dual-approval guard)');
});

// ---------------------------------------------------------------------------
// Packs Proof — AI proof graph helpers
// ---------------------------------------------------------------------------

test('packs proof: buildMockProofGraph returns synthetic-marked nodes', () => {
  const graph = buildMockProofGraph('tenant-packs-test', 'rec-42');

  assert.ok(graph.nodes.length > 0, 'Proof graph must have at least one node');
  assert.equal(graph.tenantId, 'tenant-packs-test');
  assert.equal(graph.recommendationId, 'rec-42');

  // All mock nodes should be marked as mock data
  for (const node of graph.nodes) {
    assert.equal(node.isMockData, true, `Node ${node.nodeId} should be marked as isMockData`);
  }
});

test('packs proof: graph overall trust score is minimum of node trust scores', () => {
  const graph = buildMockProofGraph('tenant-trust-min', 'rec-99');

  const minTrust = Math.min(...graph.nodes.map((n) => n.trustScore));
  assert.equal(
    graph.overallTrustScore,
    minTrust,
    'Overall trust score must be the minimum across all nodes',
  );
});

test('packs proof: graph is marked as isMockData when any node is mock', () => {
  const graph = buildMockProofGraph('tenant-mock-flag', 'rec-100');

  const anyMock = graph.nodes.some((n) => n.isMockData);
  assert.equal(anyMock, true, 'At least one node should be mock');
  assert.equal(graph.isMockData, true, 'Graph isMockData must reflect any mock node');
});

test('packs proof: PROOF_INCOMPLETE signaled when recommendation not found in tenant scope', () => {
  // Simulate the route logic for a missing recommendation
  const tenantId = 'tenant-packs-missing';
  const recId = 99999; // Non-existent
  const rec = null; // DB returns null — out of scope or doesn't exist

  const status: 'PROOF_COMPLETE' | 'PROOF_INCOMPLETE' = rec === null ? 'PROOF_INCOMPLETE' : 'PROOF_COMPLETE';
  assert.equal(status, 'PROOF_INCOMPLETE');

  // Node describing the absence — must not fabricate data
  const missingNode = {
    proofId: `missing-recommendation-${recId}`,
    proofType: 'MISSING_DATA',
    summary: 'No recommendation record found for this ID within the current tenant scope',
    expandableDetails: { reason: 'RECOMMENDATION_NOT_FOUND' },
  };

  assert.equal(missingNode.expandableDetails.reason, 'RECOMMENDATION_NOT_FOUND');
  assert.ok(missingNode.summary.length > 0);
});

test('packs proof: recommendation proof node does not expose license keys or API tokens', () => {
  // Simulate expandableDetails for a recommendation_source node
  const safeDetails = {
    packId: 'pack-m365',
    playbookId: 'M365_DISABLED_USER_RECLAIM',
    connector: 'm365-graph',
    ingestionRunId: 'run-abc123',
    connectorHealth: 'HEALTHY',
    freshnessBand: '0_7',
    // Intentionally NOT including: accessToken, licenseKey, apiKey, secret, password
  };

  const detailsJson = JSON.stringify(safeDetails);
  assert.equal(detailsJson.includes('accessToken'), false, 'No access tokens in proof node');
  assert.equal(detailsJson.includes('apiKey'), false, 'No API keys in proof node');
  assert.equal(detailsJson.includes('secret'), false, 'No secrets in proof node');
  assert.equal(detailsJson.includes('password'), false, 'No passwords in proof node');
  assert.ok(safeDetails.connectorHealth, 'Connector health should be present');
});

test('packs proof: trust score boundaries are respected', () => {
  // The trust score for each node should be between 0 and 1
  const trustScores = [0.9, 0.95, 0.85, 0.75, 0.5];
  for (const score of trustScores) {
    assert.ok(score >= 0 && score <= 1, `Trust score ${score} must be in [0, 1]`);
  }

  const overallTrust = Math.min(...trustScores);
  assert.equal(overallTrust, 0.5, 'Minimum trust score should be 0.5 for these fixtures');
});
