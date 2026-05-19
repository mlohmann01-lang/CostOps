import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExecutionEligibility } from '../lib/execution-eligibility/execution-eligibility-engine';
import { executionScenarios } from './_execution-scenario-fixtures';

test('low-risk M365 reclaim can be governed execution eligible', () => {
  assert.equal(evaluateExecutionEligibility(executionScenarios.m365LowRiskReclaim), 'GOVERNED_EXECUTION_ELIGIBLE');
});

test('SaaS downgrade requires approval', () => {
  assert.equal(evaluateExecutionEligibility(executionScenarios.saasDowngradeMediumRisk), 'APPROVAL_REQUIRED');
});

test('non-reversible DB action is never eligible', () => {
  assert.equal(evaluateExecutionEligibility(executionScenarios.nonReversibleDb), 'NEVER_ELIGIBLE');
});

test('missing lineage is never eligible', () => {
  assert.equal(evaluateExecutionEligibility(executionScenarios.missingLineage), 'NEVER_ELIGIBLE');
});

test('critical contradiction is never eligible', () => {
  assert.equal(evaluateExecutionEligibility(executionScenarios.criticalContradiction), 'NEVER_ELIGIBLE');
});
