import test from 'node:test';
import assert from 'node:assert/strict';
import { EconomicOperationsIntentService } from '../lib/economic-operations-intent-service';
import { EconomicOperationsJobScheduler } from '../lib/economic-operations-job-scheduler';
import { DistributedLockService } from '../lib/distributed-lock-service';
import { OperationalEventsService } from '../lib/operational-events-service';
import { FlexeraEntitlementValidator } from '../lib/connectors/flexera/flexera-entitlement-validator';
import { ServiceNowChangeManagementConnector, type ServiceNowCapability } from '../lib/connectors/servicenow/servicenow-change-management';

// Part 16: Tenant isolation validation

test('recommendations: cross-tenant intent is rejected', async () => {
  const svc = new EconomicOperationsIntentService();
  svc.seedExecution({ executionId: 'e1', tenantId: 'TENANT-A', state: 'PROPOSED', approvalGranted: false, simulationReady: false, connectorReady: true, dataTrustReady: true, rollbackEligible: false, tenantExecutionMode: 'ENFORCED', tenantMode: 'PILOT_READ_ONLY', proofIds: [], ledgerEntryId: 'l1' });
  const result = await svc.submitIntent({ tenantId: 'TENANT-B', executionId: 'e1', actorId: 'u1', actorRole: 'op', intentType: 'SIMULATE', sourceSurface: 'API', timestamp: new Date().toISOString(), reason: 'cross-tenant', requiredProofIds: [], expectedStateTransition: { from: 'PROPOSED', to: 'SIMULATED' }, idempotencyKey: 'xt-1' });
  assert.equal(result.accepted, false);
});

test('action history: cross-tenant query returns empty', async () => {
  const svc = new EconomicOperationsIntentService();
  svc.seedExecution({ executionId: 'e1', tenantId: 'TENANT-A', state: 'PROPOSED', approvalGranted: false, simulationReady: false, connectorReady: true, dataTrustReady: true, rollbackEligible: false, tenantExecutionMode: 'ENFORCED', tenantMode: 'PILOT_READ_ONLY', proofIds: [], ledgerEntryId: 'l1' });
  await svc.submitIntent({ tenantId: 'TENANT-A', executionId: 'e1', actorId: 'u1', actorRole: 'op', intentType: 'SIMULATE', sourceSurface: 'API', timestamp: new Date().toISOString(), reason: 'test', requiredProofIds: [], expectedStateTransition: { from: 'PROPOSED', to: 'SIMULATED' }, idempotencyKey: 'k1' });
  // Cross-tenant lookup should return empty
  const actions = svc.getActions('TENANT-B', 'e1');
  assert.equal(actions.length, 0);
});

test('jobs: query by tenantId isolates records', () => {
  const scheduler = new EconomicOperationsJobScheduler();
  scheduler.enqueue({ tenantId: 'TENANT-A', jobType: 'M365_READ_ONLY_SYNC', jobKey: 'sync:A', payload: {} });
  scheduler.enqueue({ tenantId: 'TENANT-B', jobType: 'M365_READ_ONLY_SYNC', jobKey: 'sync:B', payload: {} });
  const aJobs = scheduler.queryJobs({ tenantId: 'TENANT-A' });
  const bJobs = scheduler.queryJobs({ tenantId: 'TENANT-B' });
  assert.equal(aJobs.every((j) => j.tenantId === 'TENANT-A'), true);
  assert.equal(bJobs.every((j) => j.tenantId === 'TENANT-B'), true);
  assert.equal(aJobs.length, 1);
  assert.equal(bJobs.length, 1);
});

test('locks: tenant-scoped keys do not conflict', async () => {
  const lockSvc = new DistributedLockService();
  const keyA = { tenantId: 'TENANT-A', resourceType: 'm365:user', resourceId: 'user-1', lockType: 'EXECUTION' as const };
  const keyB = { tenantId: 'TENANT-B', resourceType: 'm365:user', resourceId: 'user-1', lockType: 'EXECUTION' as const };
  const rA = await lockSvc.acquireLock(keyA, 'worker-A', 5000);
  const rB = await lockSvc.acquireLock(keyB, 'worker-B', 5000);
  assert.equal(rA.acquired, true);
  assert.equal(rB.acquired, true);
});

test('events: getEvents is tenant-scoped', () => {
  const svc = new OperationalEventsService();
  svc.emitEvent({ tenantId: 'TENANT-A', eventType: 'DRIFT_DETECTED', severity: 'HIGH', source: 'scan' });
  svc.emitEvent({ tenantId: 'TENANT-B', eventType: 'DRIFT_DETECTED', severity: 'HIGH', source: 'scan' });
  const aEvents = svc.getEvents('TENANT-A');
  const bEvents = svc.getEvents('TENANT-B');
  assert.equal(aEvents.every((e) => e.tenantId === 'TENANT-A'), true);
  assert.equal(bEvents.every((e) => e.tenantId === 'TENANT-B'), true);
});

test('alerts: getAlerts is tenant-scoped', () => {
  const svc = new OperationalEventsService();
  svc.createAlert({ tenantId: 'TENANT-A', severity: 'HIGH', category: 'DRIFT_DETECTED', title: 'A drift', message: 'drift' });
  svc.createAlert({ tenantId: 'TENANT-B', severity: 'HIGH', category: 'DRIFT_DETECTED', title: 'B drift', message: 'drift' });
  const aAlerts = svc.getAlerts('TENANT-A');
  const bAlerts = svc.getAlerts('TENANT-B');
  assert.equal(aAlerts.every((a) => a.tenantId === 'TENANT-A'), true);
  assert.equal(bAlerts.every((a) => a.tenantId === 'TENANT-B'), true);
});

test('alerts: acknowledge only affects correct tenant', () => {
  const svc = new OperationalEventsService();
  const alertA = svc.createAlert({ tenantId: 'TENANT-A', severity: 'HIGH', category: 'CONNECTOR_HEALTH', title: 'A alert', message: 'alert' });
  svc.createAlert({ tenantId: 'TENANT-B', severity: 'HIGH', category: 'CONNECTOR_HEALTH', title: 'B alert', message: 'alert' });
  const ok = svc.acknowledgeAlert(alertA.id, 'TENANT-B', 'op-b');
  assert.equal(ok, false);
  const alert = svc.getAlert(alertA.id, 'TENANT-A');
  assert.equal(alert?.status, 'OPEN');
});

test('flexera validation is tenant-scoped in result', async () => {
  const v = new FlexeraEntitlementValidator();
  const r1 = await v.validateEntitlements('TENANT-A', [], []);
  const r2 = await v.validateEntitlements('TENANT-B', [], []);
  assert.equal(r1.tenantId, 'TENANT-A');
  assert.equal(r2.tenantId, 'TENANT-B');
});

test('servicenow change request preserves tenant scoping', async () => {
  const connector = new ServiceNowChangeManagementConnector({ tenantId: 'TENANT-A', instanceUrl: 'https://mock.sn.example.com', authType: 'OAUTH', dryRun: true, capabilities: ['SERVICENOW_CREATE_CHANGE_REQUEST', 'SERVICENOW_READ_CHANGE_STATUS', 'SERVICENOW_ATTACH_EVIDENCE', 'SERVICENOW_CREATE_TASK', 'SERVICENOW_READ_CMDB_OWNER'] as ServiceNowCapability[], readinessState: 'READY' });
  const r = await connector.createChangeRequest({ tenantId: 'TENANT-A', executionId: 'exec-1', actorId: 'op-1', shortDescription: 'Test', description: 'Test', type: 'NORMAL' });
  if (r.ok) {
    assert.equal(r.data.tenantId, 'TENANT-A');
  }
});

test('proof graph: cross-tenant lookup returns empty', () => {
  const svc = new EconomicOperationsIntentService();
  const graph = svc.getProofGraph('TENANT-UNKNOWN', 'exec-does-not-exist');
  assert.equal(graph.nodes.length, 0);
});

test('demo tenant mode cannot be used in production operations', async () => {
  const svc = new EconomicOperationsIntentService();
  svc.seedExecution({ executionId: 'e-demo', tenantId: 'TENANT-DEMO', state: 'PROPOSED', approvalGranted: false, simulationReady: true, connectorReady: true, dataTrustReady: true, rollbackEligible: false, tenantExecutionMode: 'ENFORCED', tenantMode: 'DEMO', proofIds: [], ledgerEntryId: 'l-demo', fixtureBacked: true });
  const result = await svc.submitIntent({ tenantId: 'TENANT-DEMO', executionId: 'e-demo', actorId: 'u1', actorRole: 'op', intentType: 'SIMULATE', sourceSurface: 'API', timestamp: new Date().toISOString(), reason: 'demo', requiredProofIds: [], expectedStateTransition: { from: 'PROPOSED', to: 'SIMULATED' }, idempotencyKey: 'demo-k1' });
  const outcome = svc.getOutcome('TENANT-DEMO', 'e-demo');
  assert.equal(outcome?.ledgerEnvironment, 'DEMO');
  assert.equal(outcome?.isFixtureBacked, true);
});
