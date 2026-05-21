import test from 'node:test';
import assert from 'node:assert/strict';
import { ServiceNowChangeManagementConnector, createServiceNowConnector } from '../lib/connectors/servicenow/servicenow-change-management';

import type { ServiceNowCapability } from '../lib/connectors/servicenow/servicenow-change-management';

const mockConfig = {
  tenantId: 'T1',
  instanceUrl: 'https://mock.servicenow.example.com',
  authType: 'OAUTH' as const,
  dryRun: true,
  capabilities: ['SERVICENOW_CREATE_CHANGE_REQUEST', 'SERVICENOW_READ_CHANGE_STATUS', 'SERVICENOW_ATTACH_EVIDENCE', 'SERVICENOW_CREATE_TASK', 'SERVICENOW_READ_CMDB_OWNER'] as ServiceNowCapability[],
  readinessState: 'READY' as const,
};

test('createChangeRequest succeeds in dry-run mode', async () => {
  const connector = new ServiceNowChangeManagementConnector({ ...mockConfig });
  const result = await connector.createChangeRequest({ tenantId: 'T1', executionId: 'exec-1', actorId: 'op-1', shortDescription: 'Reclaim M365 license', description: 'License removal for disabled user', type: 'NORMAL' });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.data.changeNumber.startsWith('CHG'));
    assert.equal(result.data.state, 'NEW');
    assert.equal(result.data.tenantId, 'T1');
    assert.equal(result.data.executionId, 'exec-1');
    assert.equal(result.dryRun, true);
  }
});

test('readChangeStatus returns mock state in dry-run', async () => {
  const connector = new ServiceNowChangeManagementConnector({ ...mockConfig });
  const result = await connector.readChangeStatus('sn-change-CHG1001');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.state, 'ASSESS');
    assert.ok(result.data.approvalStatus);
  }
});

test('attachEvidence succeeds in dry-run', async () => {
  const connector = new ServiceNowChangeManagementConnector({ ...mockConfig });
  const result = await connector.attachEvidence('sn-change-CHG1001', { proofId: 'p1', executionId: 'exec-1' });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.attached, true);
});

test('capability check blocks create when not enabled', async () => {
  const connector = new ServiceNowChangeManagementConnector({ ...mockConfig, capabilities: [] });
  const result = await connector.createChangeRequest({ tenantId: 'T1', executionId: 'exec-1', actorId: 'op-1', shortDescription: 'Test', description: 'Test', type: 'STANDARD' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.errorCode, 'CAPABILITY_NOT_ENABLED');
});

test('getReadinessState returns ready when configured', () => {
  const connector = new ServiceNowChangeManagementConnector({ ...mockConfig });
  const state = connector.getReadinessState();
  assert.equal(state.ready, true);
  assert.equal(state.state, 'READY');
});

test('getReadinessState returns not ready when unconfigured', () => {
  const connector = new ServiceNowChangeManagementConnector({ ...mockConfig, readinessState: 'UNCONFIGURED' });
  const state = connector.getReadinessState();
  assert.equal(state.ready, false);
  assert.equal(state.state, 'UNCONFIGURED');
  assert.ok(state.missingCapabilities.length > 0);
});

test('createServiceNowConnector factory creates mock connector', () => {
  process.env.SERVICENOW_MODE = 'MOCK_CONNECTOR';
  const connector = createServiceNowConnector('T1');
  assert.ok(connector);
  const state = connector.getReadinessState();
  assert.equal(state.ready, true);
});

test('each change request gets unique change number', async () => {
  const connector = new ServiceNowChangeManagementConnector({ ...mockConfig });
  const r1 = await connector.createChangeRequest({ tenantId: 'T1', executionId: 'exec-1', actorId: 'op-1', shortDescription: 'CR1', description: 'desc', type: 'NORMAL' });
  const r2 = await connector.createChangeRequest({ tenantId: 'T1', executionId: 'exec-2', actorId: 'op-1', shortDescription: 'CR2', description: 'desc', type: 'NORMAL' });
  if (r1.ok && r2.ok) {
    assert.notEqual(r1.data.changeNumber, r2.data.changeNumber);
  }
});

test('tenant scoping is preserved in change request', async () => {
  const connector = new ServiceNowChangeManagementConnector({ ...mockConfig });
  const result = await connector.createChangeRequest({ tenantId: 'TENANT-EU', executionId: 'exec-eu-1', actorId: 'op-eu', shortDescription: 'EU Change', description: 'EU desc', type: 'STANDARD' });
  if (result.ok) {
    assert.equal(result.data.tenantId, 'TENANT-EU');
    assert.equal(result.data.executionId, 'exec-eu-1');
  }
});
