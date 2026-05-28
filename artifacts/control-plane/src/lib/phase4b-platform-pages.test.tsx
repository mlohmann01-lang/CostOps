import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoRuntimeHealth, demoConnectorOps, demoEvidenceAudit, demoSecurity, demoSettings } from '../data/demo'

test('runtime grid renders expected statuses', () => {
  const wordings = demoRuntimeHealth.components.map((component) => component.wording)
  ;['Governance runtime operational', 'Connector degraded', 'Evidence pipeline healthy', 'Policy evaluation active', 'Verification backlog detected'].forEach((wording) => assert.ok(wordings.includes(wording)))
})

test('connector ops renders sync table', () => {
  assert.equal(demoConnectorOps.connectors.length, 5)
  const body = fs.readFileSync(new URL('../pages/connector-operations.tsx', import.meta.url), 'utf8')
  assert.equal(body.includes('connector-sync-table'), true)
  assert.ok(demoConnectorOps.connectors.some((connector) => connector.failedJob !== 'None'))
})

test('evidence timeline renders entries and cert IDs', () => {
  assert.ok(demoEvidenceAudit.timeline.length >= 3)
  assert.ok(demoEvidenceAudit.timeline.every((entry) => entry.certId.startsWith('GEC-')))
})

test('security matrix renders roles', () => {
  const roles = demoSecurity.roles.map((role) => role.role)
  ;['Admin', 'Approver', 'Operator', 'Read-only observer'].forEach((role) => assert.ok(roles.includes(role)))
})

test('settings renders read-only demo state', () => {
  assert.equal(demoSettings.workspace.mode, 'DEMO')
  const body = fs.readFileSync(new URL('../pages/SettingsPage.tsx', import.meta.url), 'utf8')
  assert.equal(body.includes('Demo mode is read-only'), true)
  assert.equal(body.includes('disabled={readOnly}'), true)
})

test('live empty states render correctly', () => {
  const files = ['../pages/RuntimeHealthView.tsx', '../pages/connector-operations.tsx', '../pages/AuditLogPage.tsx', '../pages/SecurityView.tsx', '../pages/SettingsPage.tsx']
  for (const rel of files) {
    const body = fs.readFileSync(new URL(rel, import.meta.url), 'utf8')
    assert.equal(body.includes('isEmptyLive'), true)
    assert.equal(body.includes('EmptyState'), true)
  }
})

test('all platform administration routes are reachable', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  ;['/runtime-health', '/connector-ops', '/audit-log', '/security', '/settings'].forEach((route) => assert.equal(app.includes(route), true))
})
