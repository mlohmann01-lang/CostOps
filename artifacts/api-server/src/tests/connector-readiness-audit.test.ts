import assert from 'node:assert/strict';
import test from 'node:test';
import { runConnectorReadinessAudit } from '../lib/connector-readiness';
test('CONNECTOR_READINESS_FRAMEWORK_READY audit returns PASS',async()=>{const a=await runConnectorReadinessAudit(); assert.equal(a.checkKey,'CONNECTOR_READINESS_FRAMEWORK_READY'); assert.equal(a.status,'PASS', JSON.stringify(a.checks));});
