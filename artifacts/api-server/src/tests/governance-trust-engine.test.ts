import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGovernanceTrust } from '../lib/governance-trust/governance-trust-engine';

test('trust score drops with contradiction and blast radius', () => {
  const high = evaluateGovernanceTrust({ evidenceIntegrity: 90, lineageIntegrity: 90, contradictionSeverity: 5, certificationStatus: 90, recurrencePrevention: 90, reversibility: 90, blastRadius: 10, governanceDriftRisk: 10, executiveMateriality: 20, volatilityRisk: 10 });
  const low = evaluateGovernanceTrust({ evidenceIntegrity: 90, lineageIntegrity: 90, contradictionSeverity: 80, certificationStatus: 90, recurrencePrevention: 40, reversibility: 50, blastRadius: 90, governanceDriftRisk: 70, executiveMateriality: 70, volatilityRisk: 70 });
  assert.ok(high > low);
});
