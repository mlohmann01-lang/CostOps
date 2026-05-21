import test from 'node:test';
import assert from 'node:assert/strict';
import { FlexeraEntitlementValidator } from '../lib/connectors/flexera/flexera-entitlement-validator';

function makeValidator() { return new FlexeraEntitlementValidator(); }

const sampleEntitlements = [
  { entitlementId: 'ent-1', userPrincipalName: 'alice@contoso.com', productName: 'M365 E5', skuId: 'sku-e5', skuPartNumber: 'E5', entitlementQuantity: 100, consumedQuantity: 89, monthlyCost: 57, contractId: 'ctr-1' },
  { entitlementId: 'ent-2', userPrincipalName: 'bob@contoso.com', productName: 'M365 E3', skuId: 'sku-e3', skuPartNumber: 'E3', entitlementQuantity: 50, consumedQuantity: 44, monthlyCost: 36, contractId: 'ctr-1' },
];

test('matched entitlements produce data trust boost', async () => {
  const v = makeValidator();
  const snapshots = [
    { userId: 'u1', userPrincipalName: 'alice@contoso.com', assignedSkuIds: ['sku-e5'] },
  ];
  const result = await v.validateEntitlements('T1', snapshots, sampleEntitlements);
  assert.ok(result.matchedEntitlements.length > 0);
  assert.ok(result.dataTrustBoost > 0);
  assert.equal(result.dataTrustConflict, false);
});

test('M365 assigned but not in Flexera creates mismatch', async () => {
  const v = makeValidator();
  const snapshots = [
    { userId: 'u1', userPrincipalName: 'alice@contoso.com', assignedSkuIds: ['sku-unknown'] },
  ];
  const result = await v.validateEntitlements('T1', snapshots, sampleEntitlements);
  assert.ok(result.mismatches.some((m) => m.mismatchType === 'M365_ASSIGNED_NOT_IN_FLEXERA'));
});

test('Flexera assigned but not in M365 creates high-severity mismatch', async () => {
  const v = makeValidator();
  const snapshots = [
    { userId: 'u1', userPrincipalName: 'alice@contoso.com', assignedSkuIds: [] },
  ];
  const result = await v.validateEntitlements('T1', snapshots, sampleEntitlements);
  const highSeverity = result.mismatches.filter((m) => m.mismatchType === 'FLEXERA_ASSIGNED_NOT_IN_M365' && m.severity === 'HIGH');
  assert.ok(highSeverity.length > 0);
  assert.equal(result.dataTrustConflict, true);
});

test('proof graph nodes are generated', async () => {
  const v = makeValidator();
  const snapshots = [{ userId: 'u1', userPrincipalName: 'alice@contoso.com', assignedSkuIds: ['sku-e5'] }];
  const result = await v.validateEntitlements('T1', snapshots, sampleEntitlements);
  assert.ok(result.proofGraphNodes.length > 0);
  assert.ok(result.proofGraphNodes.some((n) => n.proofType === 'FLEXERA_ENTITLEMENT_PROOF'));
});

test('mismatch proof node generated when mismatches exist', async () => {
  const v = makeValidator();
  const snapshots = [{ userId: 'u1', userPrincipalName: 'alice@contoso.com', assignedSkuIds: [] }];
  const result = await v.validateEntitlements('T1', snapshots, sampleEntitlements);
  assert.ok(result.proofGraphNodes.some((n) => n.proofType === 'FLEXERA_MISMATCH_PROOF'));
});

test('summary counts match and mismatch correctly', async () => {
  const v = makeValidator();
  const snapshots = [
    { userId: 'u1', userPrincipalName: 'alice@contoso.com', assignedSkuIds: ['sku-e5'] },
    { userId: 'u2', userPrincipalName: 'bob@contoso.com', assignedSkuIds: ['sku-unknown'] },
  ];
  const result = await v.validateEntitlements('T1', snapshots, sampleEntitlements);
  assert.ok(result.summary.matched >= 1);
  assert.ok(result.summary.mismatched >= 1);
  assert.equal(result.summary.total, result.summary.matched + result.summary.mismatched);
});

test('getReadinessState returns ready in mock mode', () => {
  const v = makeValidator();
  process.env.FLEXERA_MODE = 'MOCK_CONNECTOR';
  const state = v.getReadinessState();
  assert.equal(state.ready, true);
  assert.ok(state.capabilities.includes('FLEXERA_READ_ENTITLEMENTS'));
});

test('fetchEntitlements returns mock data in mock mode', async () => {
  const v = makeValidator();
  process.env.FLEXERA_MODE = 'MOCK_CONNECTOR';
  const entitlements = await v.fetchEntitlements('T1');
  assert.ok(entitlements.length > 0);
  assert.ok(entitlements[0].skuId);
});

test('validation is tenant-scoped in result', async () => {
  const v = makeValidator();
  const snapshots = [{ userId: 'u1', userPrincipalName: 'alice@contoso.com', assignedSkuIds: ['sku-e5'] }];
  const result = await v.validateEntitlements('TENANT-EU', snapshots, sampleEntitlements);
  assert.equal(result.tenantId, 'TENANT-EU');
});

test('case-insensitive SKU matching', async () => {
  const v = makeValidator();
  const snapshots = [{ userId: 'u1', userPrincipalName: 'alice@contoso.com', assignedSkuIds: ['SKU-E5'] }];
  const result = await v.validateEntitlements('T1', snapshots, sampleEntitlements);
  const matched = result.matchedEntitlements.find((m) => m.userPrincipalName === 'alice@contoso.com');
  assert.ok(matched, 'Should match case-insensitively');
});
