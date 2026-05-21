import test from 'node:test';
import assert from 'node:assert/strict';
import { OperationalEventsService } from '../lib/operational-events-service';

function makeSvc() { return new OperationalEventsService(); }

test('emitting approval required event creates alert', () => {
  const svc = makeSvc();
  svc.emitEvent({ tenantId: 'T1', eventType: 'APPROVAL_REQUIRED', severity: 'HIGH', source: 'intent-service', resourceType: 'execution', resourceId: 'exec-1' });
  const alerts = svc.getAlerts('T1');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].category, 'APPROVAL_REQUIRED');
  assert.equal(alerts[0].status, 'OPEN');
});

test('emitting connector degraded event creates connector health alert', () => {
  const svc = makeSvc();
  svc.emitEvent({ tenantId: 'T1', eventType: 'CONNECTOR_DEGRADED', severity: 'HIGH', source: 'health-check' });
  const alerts = svc.getAlerts('T1');
  assert.ok(alerts.some((a) => a.category === 'CONNECTOR_HEALTH'));
});

test('duplicate event with same dedupeKey is not emitted twice', () => {
  const svc = makeSvc();
  svc.emitEvent({ tenantId: 'T1', eventType: 'DRIFT_DETECTED', severity: 'HIGH', source: 'drift-scan', dedupeKey: 'drift:exec-1' });
  svc.emitEvent({ tenantId: 'T1', eventType: 'DRIFT_DETECTED', severity: 'HIGH', source: 'drift-scan', dedupeKey: 'drift:exec-1' });
  const events = svc.getEvents('T1', 'DRIFT_DETECTED');
  assert.equal(events.length, 1);
});

test('acknowledging alert changes status', () => {
  const svc = makeSvc();
  const alert = svc.createAlert({ tenantId: 'T1', severity: 'HIGH', category: 'EXECUTION_BLOCKED', title: 'Test', message: 'Test message', recommendedAction: 'Review' });
  const ok = svc.acknowledgeAlert(alert.id, 'T1', 'operator-1');
  assert.equal(ok, true);
  const updated = svc.getAlert(alert.id, 'T1');
  assert.equal(updated?.status, 'ACKNOWLEDGED');
  assert.equal(updated?.acknowledgedBy, 'operator-1');
  assert.ok(updated?.acknowledgedAt);
});

test('acknowledging already acknowledged alert returns false', () => {
  const svc = makeSvc();
  const alert = svc.createAlert({ tenantId: 'T1', severity: 'MEDIUM', category: 'READINESS_GAP', title: 'Test', message: 'Gap' });
  svc.acknowledgeAlert(alert.id, 'T1', 'op-1');
  const ok = svc.acknowledgeAlert(alert.id, 'T1', 'op-2');
  assert.equal(ok, false);
});

test('alerts are tenant-scoped', () => {
  const svc = makeSvc();
  svc.createAlert({ tenantId: 'T1', severity: 'HIGH', category: 'DRIFT_DETECTED', title: 'Drift T1', message: 'T1 drift' });
  svc.createAlert({ tenantId: 'T2', severity: 'HIGH', category: 'DRIFT_DETECTED', title: 'Drift T2', message: 'T2 drift' });
  const t1Alerts = svc.getAlerts('T1');
  const t2Alerts = svc.getAlerts('T2');
  assert.equal(t1Alerts.length, 1);
  assert.equal(t2Alerts.length, 1);
  assert.notEqual(t1Alerts[0].id, t2Alerts[0].id);
});

test('getAlerts can filter by status', () => {
  const svc = makeSvc();
  const a1 = svc.createAlert({ tenantId: 'T1', severity: 'HIGH', category: 'SYNC_FAILURE', title: 'Sync fail', message: 'fail' });
  svc.createAlert({ tenantId: 'T1', severity: 'LOW', category: 'READINESS_GAP', title: 'Gap', message: 'gap' });
  svc.acknowledgeAlert(a1.id, 'T1', 'op-1');
  const open = svc.getAlerts('T1', 'OPEN');
  const ack = svc.getAlerts('T1', 'ACKNOWLEDGED');
  assert.equal(open.length, 1);
  assert.equal(ack.length, 1);
});

test('createAlert assigns correct fields', () => {
  const svc = makeSvc();
  const alert = svc.createAlert({ tenantId: 'T1', severity: 'CRITICAL', category: 'ROLLBACK_REQUIRED', title: 'Rollback needed', message: 'Execution drifted', resourceType: 'execution', resourceId: 'exec-42', recommendedAction: 'Initiate rollback' });
  assert.equal(alert.category, 'ROLLBACK_REQUIRED');
  assert.equal(alert.severity, 'CRITICAL');
  assert.equal(alert.resourceId, 'exec-42');
  assert.equal(alert.recommendedAction, 'Initiate rollback');
  assert.equal(alert.status, 'OPEN');
});

test('emitEvent returns event with correct fields', () => {
  const svc = makeSvc();
  const evt = svc.emitEvent({ tenantId: 'T1', eventType: 'VERIFICATION_FAILED', severity: 'MEDIUM', source: 'verify-job', resourceType: 'execution', resourceId: 'exec-99', payload: { reason: 'SKU_STILL_ASSIGNED' } });
  assert.equal(evt.eventType, 'VERIFICATION_FAILED');
  assert.equal(evt.tenantId, 'T1');
  assert.equal(evt.payload.reason, 'SKU_STILL_ASSIGNED');
  assert.equal(evt.status, 'PENDING');
});

test('INFO severity event does not create alert', () => {
  const svc = makeSvc();
  svc.emitEvent({ tenantId: 'T1', eventType: 'EXECUTION_SUBMITTED', severity: 'INFO', source: 'system' });
  const alerts = svc.getAlerts('T1');
  assert.equal(alerts.length, 0);
});
