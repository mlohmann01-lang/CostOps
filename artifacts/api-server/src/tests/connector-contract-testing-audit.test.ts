import assert from 'node:assert/strict';
import test from 'node:test';
import { runConnectorContractTestingAudit } from '../lib/connector-contract-testing';

test('CONNECTOR_CONTRACT_TEST_HARNESS_READY audit returns PASS', async () => {
  const audit = await runConnectorContractTestingAudit();
  assert.equal(audit.checkKey, 'CONNECTOR_CONTRACT_TEST_HARNESS_READY');
  assert.equal(audit.status, 'PASS', JSON.stringify(audit.checks));
});
