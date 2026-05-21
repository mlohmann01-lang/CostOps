import test from 'node:test';
import assert from 'node:assert/strict';
import { M365_PLAYBOOK_REGISTRY, M365_FEATURE_UTILIZATION_CLASSIFIER } from '../lib/connectors/m365/m365-economic-operations-registry';

test('registry includes required m365 economic vertical slices', () => {
  const ids = Object.keys(M365_PLAYBOOK_REGISTRY);
  [
    'm365-inactive-user-rightsizing',
    'm365-e5-to-e3-downgrade',
    'm365-addon-reclaim',
    'm365-copilot-reclamation-governance',
    'm365-license-overlap-elimination',
  ].forEach((id) => assert.equal(ids.includes(id), true));
});

test('all registered slices reuse governed operational spine controls', () => {
  for (const entry of Object.values(M365_PLAYBOOK_REGISTRY)) {
    assert.equal(entry.simulationSupport, true);
    assert.equal(entry.rollbackSupport, true);
    assert.equal(entry.executionCapabilities.length > 0, true);
    assert.equal(entry.verificationStrategy.length > 0, true);
    assert.equal(entry.driftStrategy.length > 0, true);
  }
});

test('feature utilization classifier deterministic thresholds', () => {
  assert.equal(M365_FEATURE_UTILIZATION_CLASSIFIER.classifyTierNeed(0.8), 'E5_REQUIRED');
  assert.equal(M365_FEATURE_UTILIZATION_CLASSIFIER.classifyTierNeed(0.5), 'E3_FIT');
  assert.equal(M365_FEATURE_UTILIZATION_CLASSIFIER.classifyTierNeed(0.1), 'RIGHTSIZE_CANDIDATE');
});
