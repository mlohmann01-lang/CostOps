/**
 * Token Governance Tests (Sprint D, Part 6)
 *
 * Test suite covering:
 * - Policy enforcement
 * - Budget gate blocking/allowing
 * - Downgrade execution flow (with DUAL_APPROVAL)
 * - Savings verification calculation
 * - Proof graph integration
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenGovernancePolicyRegistry } from '../lib/token-governance/token-governance-policy.js';
import { budgetGate } from '../lib/token-governance/budget-gate.js';
import { modelDowngradeExecutor } from '../lib/token-governance/model-downgrade-execution.js';
import { savingsVerificationService } from '../lib/token-governance/savings-verification.js';

// --- Policy Registry ---

test('policy: creates default policy with correct structure', () => {
  const policy = tokenGovernancePolicyRegistry.createDefaultPolicy('tenant-123');

  assert.strictEqual(policy.tenantId, 'tenant-123');
  assert.strictEqual(policy.riskClass, 'C');
  assert.strictEqual(policy.enabled, false); // Disabled by default
  assert.ok(policy.budgets.length > 0, 'Should have at least one budget');
});

test('policy: validates policy readiness', () => {
  const policy = tokenGovernancePolicyRegistry.createDefaultPolicy('tenant-123');
  const readiness = tokenGovernancePolicyRegistry.checkPolicyReadiness(policy);

  assert.strictEqual(readiness.status, 'READY');
  assert.strictEqual(readiness.errors.length, 0);
});

test('policy: detects invalid budgets', () => {
  const policy = tokenGovernancePolicyRegistry.createDefaultPolicy('tenant-123');
  policy.budgets[0].budgetAmountUSD = -100; // Invalid

  const readiness = tokenGovernancePolicyRegistry.checkPolicyReadiness(policy);
  assert.ok(readiness.errors.length > 0, 'Should detect invalid budget amount');
});

test('policy: registers and retrieves policies', () => {
  const policy = tokenGovernancePolicyRegistry.createDefaultPolicy('tenant-456');
  policy.enabled = true;
  tokenGovernancePolicyRegistry.registerPolicy(policy);

  const retrieved = tokenGovernancePolicyRegistry.getPolicy(policy.policyId);
  assert.strictEqual(retrieved?.policyId, policy.policyId);

  const listResult = tokenGovernancePolicyRegistry.listTenantPolicies('tenant-456');
  assert.ok(listResult.some((p) => p.policyId === policy.policyId));
});

// --- Budget Gate ---

test('budget: allows request when no policy exists', () => {
  const result = budgetGate.checkBudget('tenant-new', 'gpt-4', 100, 50);

  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.requiresApproval, false);
});

test('budget: blocks request exceeding maxTokensPerRequest', () => {
  const policy = tokenGovernancePolicyRegistry.createDefaultPolicy('tenant-777');
  policy.enabled = true;
  policy.maxTokensPerRequest = 1000;
  policy.enforcementMode = 'BLOCK';
  tokenGovernancePolicyRegistry.registerPolicy(policy);

  const result = budgetGate.checkBudget('tenant-777', 'gpt-4', 800, 500); // 1300 total

  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason?.includes('maxTokensPerRequest'));
});

test('budget: requires approval for high output ratio', () => {
  const policy = tokenGovernancePolicyRegistry.createDefaultPolicy('tenant-888');
  policy.enabled = true;
  policy.maxOutputRatio = 0.4; // 40%
  policy.enforcementMode = 'REQUIRE_APPROVAL';
  tokenGovernancePolicyRegistry.registerPolicy(policy);

  const result = budgetGate.checkBudget('tenant-888', 'gpt-4', 100, 200); // 66% output ratio

  assert.strictEqual(result.requiresApproval, true);
  assert.ok(result.reason?.includes('Output ratio'));
});

test('budget: estimates cost based on model pricing', () => {
  const result = budgetGate.checkBudget('tenant-999', 'gpt-3.5-turbo', 1000, 500);

  assert.ok(result.estimatedCostUSD > 0, 'Should estimate positive cost');
  assert.ok(result.estimatedCostUSD < 0.01, 'gpt-3.5-turbo should be cheap');
});

// --- Model Downgrade Execution ---

test('downgrade: creates proposal with correct risk classification', () => {
  const policy = tokenGovernancePolicyRegistry.createDefaultPolicy('tenant-dg1');
  policy.riskClass = 'A';
  policy.enabled = true;
  tokenGovernancePolicyRegistry.registerPolicy(policy);

  const proposal = modelDowngradeExecutor.createProposal(
    'tenant-dg1',
    'gpt-4',
    'gpt-3.5-turbo',
    'Cost optimization',
    500,
    ['workflow-1', 'workflow-2'],
  );

  assert.strictEqual(proposal.riskClass, 'A');
  assert.strictEqual(proposal.requiresDualApproval, true);
});

test('downgrade: executes flow with single approval for class C', () => {
  const proposal = modelDowngradeExecutor.createProposal(
    'tenant-dg2',
    'gpt-4',
    'gpt-3.5-turbo',
    'Test downgrade',
    100,
    [],
  );

  const execution = modelDowngradeExecutor.createExecution(proposal);
  assert.strictEqual(execution.status, 'PENDING_APPROVAL');

  // Record approval
  const approval = modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');
  assert.strictEqual(approval.approved, true);

  const updated = modelDowngradeExecutor.getExecution(execution.executionId);
  assert.strictEqual(updated?.status, 'APPROVED');
});

test('downgrade: blocks same-actor dual approval', () => {
  const proposal = modelDowngradeExecutor.createProposal(
    'tenant-dg3',
    'gpt-4',
    'gpt-3.5-turbo',
    'A-class downgrade',
    100,
    [],
  );
  // Force A-class behavior
  proposal.requiresDualApproval = true;

  const execution = modelDowngradeExecutor.createExecution(proposal);

  // First approval from actor-1
  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');

  // Try same actor for second approval
  const secondAttempt = modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');
  assert.strictEqual(secondAttempt.blocked, true);
});

test('downgrade: accepts different actor for second approval', () => {
  const proposal = modelDowngradeExecutor.createProposal(
    'tenant-dg4',
    'gpt-4',
    'gpt-3.5-turbo',
    'A-class downgrade',
    100,
    [],
  );
  proposal.requiresDualApproval = true;

  const execution = modelDowngradeExecutor.createExecution(proposal);

  // First approval
  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');

  // Second approval from different actor
  const secondApproval = modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-2');
  assert.strictEqual(secondApproval.approved, true);

  const updated = modelDowngradeExecutor.getExecution(execution.executionId);
  assert.strictEqual(updated?.status, 'APPROVED');
});

test('downgrade: executes routing change', () => {
  const proposal = modelDowngradeExecutor.createProposal(
    'tenant-dg5',
    'gpt-4',
    'gpt-3.5-turbo',
    'Routing change',
    100,
    [],
  );

  const execution = modelDowngradeExecutor.createExecution(proposal);
  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');

  const execResult = modelDowngradeExecutor.executeDowngrade(execution.executionId);
  assert.strictEqual(execResult.success, true);

  const updated = modelDowngradeExecutor.getExecution(execution.executionId);
  assert.strictEqual(updated?.status, 'EXECUTED');

  // Verify routing
  const resolved = modelDowngradeExecutor.resolveModel('gpt-4');
  assert.strictEqual(resolved, 'gpt-3.5-turbo');
});

// --- Savings Verification ---

test('verification: records baseline measurement', () => {
  const proposal = modelDowngradeExecutor.createProposal('tenant-sv1', 'gpt-4', 'gpt-3.5-turbo', 'Test', 100, []);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  const baseline = savingsVerificationService.recordBaseline(
    execution.executionId,
    'tenant-sv1',
    'gpt-4',
    30,
    10000,
    50.0,
  );

  assert.strictEqual(baseline.totalTokens, 10000);
  assert.strictEqual(baseline.totalCostUSD, 50.0);
  assert.ok(baseline.costPerToken > 0);
});

test('verification: initializes verification from execution', () => {
  const proposal = modelDowngradeExecutor.createProposal('tenant-sv2', 'gpt-4', 'gpt-3.5-turbo', 'Test', 100, []);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  // Record baseline first
  savingsVerificationService.recordBaseline(execution.executionId, 'tenant-sv2', 'gpt-4', 30, 10000, 50.0);

  // Execute downgrade
  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');
  modelDowngradeExecutor.executeDowngrade(execution.executionId);

  // Initialize verification
  const verification = savingsVerificationService.initializeVerification(execution.executionId);
  assert.ok(verification);
  assert.strictEqual(verification?.status, 'PENDING');
  assert.strictEqual(verification?.baselineCostUSD, 50.0);
});

test('verification: calculates realized savings with high confidence', () => {
  const proposal = modelDowngradeExecutor.createProposal('tenant-sv3', 'gpt-4', 'gpt-3.5-turbo', 'Test', 100, []);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  savingsVerificationService.recordBaseline(execution.executionId, 'tenant-sv3', 'gpt-4', 30, 10000, 50.0);
  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');
  modelDowngradeExecutor.executeDowngrade(execution.executionId);

  const verification = savingsVerificationService.initializeVerification(execution.executionId);
  assert.ok(verification);

  // Record measurement showing 20% savings
  const measured = savingsVerificationService.recordMeasurement(
    verification!.verificationId,
    9500, // 5% fewer tokens
    40.0, // 20% cost reduction
  );

  assert.strictEqual(measured?.realizedSavingsUSD, 10.0); // $10 saved
  assert.ok(measured!.realizedSavingsPercent >= 15, 'Should have >15% savings for HIGH confidence');
  assert.strictEqual(measured?.confidenceLevel, 'HIGH');
});

test('verification: marks inconclusive when token usage increases', () => {
  const proposal = modelDowngradeExecutor.createProposal('tenant-sv4', 'gpt-4', 'gpt-3.5-turbo', 'Test', 100, []);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  savingsVerificationService.recordBaseline(execution.executionId, 'tenant-sv4', 'gpt-4', 30, 10000, 50.0);
  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');
  modelDowngradeExecutor.executeDowngrade(execution.executionId);

  const verification = savingsVerificationService.initializeVerification(execution.executionId);
  assert.ok(verification);

  // Record measurement with MORE tokens used
  const measured = savingsVerificationService.recordMeasurement(
    verification!.verificationId,
    12000, // 20% MORE tokens (workflow load increased)
    55.0,  // More cost
  );

  assert.strictEqual(measured?.confidenceLevel, 'LOW');
  assert.strictEqual(measured?.status, 'INCONCLUSIVE');
});

test('verification: computes total realized savings for tenant', () => {
  const proposal1 = modelDowngradeExecutor.createProposal('tenant-sv5', 'gpt-4', 'gpt-3.5-turbo', 'Test1', 100, []);
  const execution1 = modelDowngradeExecutor.createExecution(proposal1);

  savingsVerificationService.recordBaseline(execution1.executionId, 'tenant-sv5', 'gpt-4', 30, 10000, 100.0);
  modelDowngradeExecutor.recordApproval(execution1.executionId, 'actor-1');
  modelDowngradeExecutor.executeDowngrade(execution1.executionId);

  const v1 = savingsVerificationService.initializeVerification(execution1.executionId);
  savingsVerificationService.recordMeasurement(v1!.verificationId, 9000, 70.0); // $30 saved

  const totals = savingsVerificationService.getTotalRealizedSavings('tenant-sv5');
  assert.strictEqual(totals.totalSavingsUSD, 30.0);
  assert.strictEqual(totals.completedCount, 1);
});

test('verification: builds proof graph node', () => {
  const proposal = modelDowngradeExecutor.createProposal('tenant-sv6', 'gpt-4', 'gpt-3.5-turbo', 'Test', 100, []);
  const execution = modelDowngradeExecutor.createExecution(proposal);

  savingsVerificationService.recordBaseline(execution.executionId, 'tenant-sv6', 'gpt-4', 30, 10000, 50.0);
  modelDowngradeExecutor.recordApproval(execution.executionId, 'actor-1');
  modelDowngradeExecutor.executeDowngrade(execution.executionId);

  const verification = savingsVerificationService.initializeVerification(execution.executionId);
  savingsVerificationService.recordMeasurement(verification!.verificationId, 9000, 35.0);

  const node = savingsVerificationService.buildProofGraphNode(verification!);
  assert.strictEqual(node.nodeType, 'SAVINGS_VERIFICATION');
  assert.ok((node.properties.realizedSavingsUSD as number) > 0);
  assert.ok(!JSON.stringify(node).includes('sk-'), 'No API keys in proof graph');
});
