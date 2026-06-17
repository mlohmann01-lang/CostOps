import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultConnectorManifests, CONNECTOR_FAMILIES, OUTPUT_CONTRACTS } from '../lib/connector-readiness';
import { connectorContractFixtures, ConnectorContractHarness, ConnectorContractCertificationService, outputContractRules, validateOutputContract } from '../lib/connector-contract-testing';

test('fixtures exist for all connector families and cover manifest contracts', () => {
  assert.ok(CONNECTOR_FAMILIES.every((family) => connectorContractFixtures.some((fixture) => fixture.connectorFamily === family)));
  for (const manifest of defaultConnectorManifests) {
    for (const contract of manifest.outputContracts) {
      assert.ok(connectorContractFixtures.some((fixture) => fixture.connectorKey === manifest.connectorKey && fixture.outputContract === contract && fixture.fixtureType === 'VALID'), `${manifest.connectorKey}:${contract}`);
      assert.ok(connectorContractFixtures.some((fixture) => fixture.connectorKey === manifest.connectorKey && fixture.outputContract === contract && fixture.fixtureType === 'INVALID'), `${manifest.connectorKey}:${contract}`);
      assert.ok(connectorContractFixtures.some((fixture) => fixture.connectorKey === manifest.connectorKey && fixture.outputContract === contract && fixture.fixtureType === 'EDGE_CASE'), `${manifest.connectorKey}:${contract}`);
    }
  }
});

test('validators cover all output contracts and enforce required numeric and confidence rules', () => {
  assert.ok(OUTPUT_CONTRACTS.every((contract) => outputContractRules[contract]));
  assert.equal(validateOutputContract('COMMERCIAL_VENDOR', {}).status, 'FAIL');
  assert.ok(validateOutputContract('FINANCIAL_INVOICE', { invoiceNumber: 'i', vendorId: 'v', invoiceDate: '2026-01-01', amount: -1, currency: 'USD', status: 'PAID', source: 'test' }).errors.some((error) => error.code === 'INVALID_NON_NEGATIVE_NUMBER'));
  assert.ok(validateOutputContract('GRAPH_NODE', { type: 'Vendor', displayName: 'Vendor', source: 'test', confidence: 2 }).errors.some((error) => error.code === 'INVALID_CONFIDENCE'));
});

test('harness validates valid invalid and edge fixtures with previews', async () => {
  const harness = new ConnectorContractHarness();
  const valid = connectorContractFixtures.find((fixture) => fixture.fixtureType === 'VALID')!;
  const invalid = connectorContractFixtures.find((fixture) => fixture.fixtureType === 'INVALID')!;
  const edge = connectorContractFixtures.find((fixture) => fixture.fixtureType === 'EDGE_CASE')!;
  const validResult = await harness.runFixture(valid.id);
  assert.equal(validResult.status, 'PASS');
  assert.ok(validResult.normalisedPreview);
  assert.ok(validResult.graphPreview);
  assert.equal(validResult.evidencePreview?.status, 'CREATED');
  assert.equal((await harness.runFixture(invalid.id)).status, 'FAIL');
  assert.ok(['PASS', 'WARN'].includes((await harness.runFixture(edge.id)).status));
});

test('run connector family and all work', async () => {
  const harness = new ConnectorContractHarness();
  assert.ok((await harness.runConnector('m365')).results.length > 0);
  assert.ok((await harness.runConnectorFamily('M365')).results.length > 0);
  assert.ok((await harness.runAll()).results.length >= connectorContractFixtures.length);
});

test('certification supports connector family all and explicit blockers', async () => {
  const service = new ConnectorContractCertificationService();
  assert.equal((await service.certifyConnector('m365')).status, 'CERTIFIED');
  assert.ok((await service.certifyConnectorFamily('M365')).length > 0);
  assert.equal((await service.certifyAllConnectors()).length, defaultConnectorManifests.length);
  const brokenHarness = new ConnectorContractHarness(connectorContractFixtures.filter((fixture) => !(fixture.connectorKey === 'm365' && fixture.outputContract === 'OWNERSHIP_USER')));
  const broken = await new ConnectorContractCertificationService(brokenHarness).certifyConnector('m365');
  assert.notEqual(broken.status, 'CERTIFIED');
  assert.ok(broken.blockers.length > 0);
});

test('routes mounted', async () => {
  const { readFile } = await import('node:fs/promises');
  const routeIndex = await readFile('artifacts/api-server/src/routes/index.ts', 'utf8');
  assert.match(routeIndex, /connector-contract-testing/);
});
