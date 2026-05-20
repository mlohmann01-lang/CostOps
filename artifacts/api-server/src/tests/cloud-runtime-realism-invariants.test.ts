import test from 'node:test';import assert from 'node:assert/strict';import { cloud_action_semantics } from '../lib/connector-action-semantics/cloud-action-semantics';
test('shared networking escalates cloud blast radius',()=>{ const a=cloud_action_semantics[3]; assert.equal(a.sharedNetworkRisk,'HIGH'); assert.equal(a.iamDependencyRisk,'HIGH'); assert.equal(a.environmentDriftRisk,'HIGH');});
