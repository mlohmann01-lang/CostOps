import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connectorRealityAudit,
  pillarCoverageAudit,
  decisionLineageAudit,
  demoRealityAudit,
  silentFallbackRisks,
  authorityMaturityAudit,
  technicalDebtRegistry,
  pillarStoryReadinessAudit,
  buildPlatformReadinessReport,
} from '../lib/platform-audit';

const REQUIRED_CONNECTORS = ['M365', 'Flexera', 'ServiceNow', 'AWS', 'Azure', 'Snowflake', 'Databricks', 'AI Providers', 'Technology Portfolio'];
const REALITY_LEVELS = ['LIVE', 'PARTIAL', 'MOCK', 'STUB', 'NOT_SUPPORTED'];
const PILLARS = ['AUTO_EXECUTION', 'VALUE_REALISATION', 'PROTECTED_GOVERNANCE', 'SHARED_PLATFORM'];
const AUTHORITIES = ['Principal Authority', 'Evidence Registry', 'Asset Registry', 'Decision Authority', 'Value Realisation Authority'];

test('every required connector is classified across all four reality dimensions', () => {
  for (const connector of REQUIRED_CONNECTORS) {
    const entry = connectorRealityAudit.find((c) => c.connector === connector);
    assert.ok(entry, `${connector} must be classified`);
    for (const dim of ['discovery', 'execution', 'verification', 'protection'] as const) {
      assert.ok(REALITY_LEVELS.includes(entry![dim]), `${connector}.${dim} has unknown level ${entry![dim]}`);
    }
  }
});

test('cloud connectors with simulated execution are not over-credited as LIVE', () => {
  for (const connector of ['AWS', 'Azure', 'Snowflake', 'Databricks']) {
    const entry = connectorRealityAudit.find((c) => c.connector === connector);
    assert.equal(entry!.execution, 'MOCK', `${connector} execution should be classified MOCK, not LIVE`);
  }
});

test('every pillar coverage entry classifies into a known pillar and status', () => {
  assert.ok(pillarCoverageAudit.length > 0);
  for (const entry of pillarCoverageAudit) {
    assert.ok(PILLARS.includes(entry.pillar));
    assert.ok(['COMPLETE', 'PARTIAL', 'PLANNED', 'STUB'].includes(entry.status));
  }
});

test('decision lineage audit covers M365 and Flexera with valid link statuses', () => {
  const sources = decisionLineageAudit.map((e) => e.source);
  assert.ok(sources.includes('M365'));
  assert.ok(sources.includes('Flexera'));
  const validStatuses = ['COMPLETE', 'INFERRED', 'MISSING', 'BROKEN'];
  for (const entry of decisionLineageAudit) {
    for (const link of [entry.investmentToAsset, entry.assetToDecision, entry.decisionToOutcome, entry.outcomeToProtectedValue]) {
      assert.ok(validStatuses.includes(link));
    }
  }
});

test('demo reality audit classifies all major customer-facing surfaces and flags silent fallback risk', () => {
  assert.ok(demoRealityAudit.length > 0);
  const validClassifications = ['LIVE_ONLY', 'LIVE_WITH_EMPTY_STATE', 'DEMO_CAPABLE', 'DEMO_ONLY'];
  for (const entry of demoRealityAudit) {
    assert.ok(validClassifications.includes(entry.classification));
  }
  const risks = silentFallbackRisks();
  assert.equal(risks.length, 0, 'Sprint 8B resolved the known silent-fallback hooks; none should remain flagged');
});

test('every required authority is assessed across all maturity dimensions', () => {
  const VALID = ['READY', 'PARTIAL', 'FOUNDATIONAL'];
  for (const authority of AUTHORITIES) {
    const entry = authorityMaturityAudit.find((a) => a.authority === authority);
    assert.ok(entry, `${authority} must be assessed`);
    for (const dim of ['schema', 'apis', 'tests', 'uiExposure', 'proofPackExposure', 'productionReadiness'] as const) {
      assert.ok(VALID.includes(entry![dim]), `${authority}.${dim} has unknown level`);
    }
  }
});

test('technical debt registry classifies every entry with a severity and recommendation', () => {
  assert.ok(technicalDebtRegistry.length > 0);
  for (const entry of technicalDebtRegistry) {
    assert.ok(['MUST_FIX', 'SHOULD_FIX', 'ACCEPTED_DEBT'].includes(entry.severity));
    assert.ok(entry.recommendation.length > 0);
  }
});

test('pillar story readiness audit covers all three pillars', () => {
  const pillars = pillarStoryReadinessAudit.map((e) => e.pillar);
  assert.ok(pillars.includes('AUTO_EXECUTION'));
  assert.ok(pillars.includes('VALUE_REALISATION'));
  assert.ok(pillars.includes('PROTECTED_GOVERNANCE'));
});

test('platform readiness report generates a score, category breakdown, blockers, and next actions', () => {
  const report = buildPlatformReadinessReport();
  assert.ok(report.overallScore >= 0 && report.overallScore <= 100);
  assert.equal(report.categories.length, 6);
  const categories = report.categories.map((c) => c.category);
  assert.deepEqual(
    new Set(categories),
    new Set(['CONTROL_ENGINE', 'CANONICAL_MODEL', 'USER_EXPERIENCE', 'PROOF_AND_AUDITABILITY', 'CONNECTOR_REALITY', 'EXECUTIVE_STORY']),
  );
  for (const category of report.categories) {
    assert.ok(category.score >= 0 && category.score <= 100);
    assert.ok(category.rationale.length > 0);
  }
  assert.ok(Array.isArray(report.blockers));
  assert.ok(report.nextActions.length > 0);
});
