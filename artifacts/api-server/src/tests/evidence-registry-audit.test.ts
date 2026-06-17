import test from 'node:test';import assert from 'node:assert/strict';import { runEvidenceRegistryAudit, EVIDENCE_REGISTRY_READY } from '../lib/evidence-registry';
test('EVIDENCE_REGISTRY_READY audit returns PASS',async()=>{const audit=await runEvidenceRegistryAudit();assert.equal(audit.checkKey,EVIDENCE_REGISTRY_READY);assert.equal(audit.status,'PASS')});
