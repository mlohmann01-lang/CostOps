import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { liveTenantReadinessApiPaths, demoLiveTenantReadiness, useLiveTenantReadinessData } from '../hooks/useLiveTenantReadinessData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

function read(path: string) { return fs.readFileSync(new URL(path, import.meta.url), 'utf8') }

test('route exists and navigation entry exists under Admin', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import LiveTenantReadinessView from './pages/LiveTenantReadinessView'"), true)
  assert.equal(app.includes('path="/live-tenant-readiness"'), true)
  const admin = NAV_GROUPS.find((group) => group.label === 'Admin')!
  assert.ok(admin.items.some((item) => item.label === 'Live Tenant Readiness'), 'Admin must have Live Tenant Readiness')
  assert.ok(admin.items.some((item) => item.label === 'Workspace'), 'Admin must have Workspace')
  assert.ok(admin.items.some((item) => item.label === 'Connectors'), 'Admin must have Connectors')
})

test('data hook consumes runtime APIs and exposes demo fallback', () => {
  assert.equal(typeof useLiveTenantReadinessData, 'function')
  assert.deepEqual([...liveTenantReadinessApiPaths], ['/api/runtime/live-tenant-readiness', '/api/runtime/connector-health', '/api/runtime/evidence-export-readiness', '/api/runtime/tenant-execution-policy'])
  const hook = read('../hooks/useLiveTenantReadinessData.ts')
  assert.equal(hook.includes("/api/runtime/connector-health/check"), true)
  assert.equal(hook.includes("method: 'POST'"), true)
  assert.equal(hook.includes("/api/runtime/tenant-execution-policy"), true)
  assert.equal(hook.includes("method: 'PATCH'"), true)
  assert.equal(demoLiveTenantReadiness.readiness.readyForPilot, true)
  assert.equal(demoLiveTenantReadiness.readiness.readyForProduction, false)
  assert.equal(demoLiveTenantReadiness.readiness.certifiedWedges.m365, true)
  assert.equal(demoLiveTenantReadiness.readiness.certifiedWedges.ai, true)
  assert.equal(demoLiveTenantReadiness.readiness.certifiedWedges.servicenow, true)
  assert.equal(demoLiveTenantReadiness.readiness.certifiedWedges.aws, true)
  assert.equal(demoLiveTenantReadiness.readiness.certifiedWedges.azure, true)
  assert.equal(demoLiveTenantReadiness.connectorHealth.some((row) => row.status === 'DEGRADED'), true)
  assert.equal(demoLiveTenantReadiness.evidenceExportReadiness.some((row) => !row.ready), true)
  assert.equal(demoLiveTenantReadiness.readiness.auditCompleteness.incomplete > 0, true)
})

test('header mode and readiness badges render', () => {
  const page = read('../pages/LiveTenantReadinessView.tsx')
  for (const text of ['Live Tenant Readiness', 'Validate certified wedge availability, connector health, execution policy, evidence export readiness, and audit completeness before live tenant execution.', 'DEMO', 'PILOT_READ_ONLY', 'PILOT_CONTROLLED_EXECUTION', 'PRODUCTION_CONTROLLED_EXECUTION', 'Ready for Pilot', 'Blocked for Pilot', 'Ready for Production', 'Blocked for Production']) assert.equal(page.includes(text), true)
})

test('executive readiness summary and certified wedge cards render', () => {
  const page = read('../pages/LiveTenantReadinessView.tsx')
  for (const text of ['Certified Wedges', 'Connector Health', 'Execution Allowed', 'Dry Run Only', 'Execution Blocked', 'Audit Complete', 'Evidence Export Ready', 'M365', 'AI', 'ServiceNow', 'AWS', 'Azure']) assert.equal(page.includes(text), true)
})

test('tenant execution policy renders and editing is disabled in demo mode', () => {
  const page = read('../pages/LiveTenantReadinessView.tsx')
  for (const text of ['Tenant Execution Policy', 'Mode', 'Allow Real Writes', 'Allow Dry Run', 'Require Approval Authority', 'Require Trust Authority', 'Require Evidence', 'Require Rollback For Destructive', 'Max Blast Radius Allowed', 'Allowed Domains', 'Save Tenant Execution Policy', 'Policy editing disabled in demo mode.']) assert.equal(page.includes(text), true)
  assert.equal(page.includes('disabled={!canEditPolicy}'), true)
})

test('connector health table and refresh action render', () => {
  const page = read('../pages/LiveTenantReadinessView.tsx')
  for (const text of ['Connector Health', 'Refresh Connector Health', 'Connector', 'Type', 'Status', 'Credential Expires', 'Scopes', 'Missing Scopes', 'Rate Limit Reset', 'Last Checked', 'Errors', 'HEALTHY', 'DEGRADED', 'DISCONNECTED', 'EXPIRED_CREDENTIALS', 'MISSING_SCOPES', 'RATE_LIMITED']) assert.equal(page.includes(text), true)
})

test('execution gate audit completeness evidence export and blockers render', () => {
  const page = read('../pages/LiveTenantReadinessView.tsx')
  for (const text of ['Execution Gate', 'Allowed', 'Dry Run Only', 'Blocked', 'All real execution must pass tenant mode, certified wedge, trust, approval, evidence, rollback, connector health, domain and blast-radius checks.', 'Audit Completeness', 'Complete', 'Incomplete', 'Live executions must include governed action, trust authority, approval authority, execution, pre-state, post-state, verification, outcome, protection and drift policy events.', 'Evidence Export Readiness', 'Wedge', 'Action', 'Ready', 'Missing Items', 'Generated At', 'Required Fixes Before Live Execution', 'No live tenant blockers detected.']) assert.equal(page.includes(text), true)
})

test('evidence missing item badges deterministic narrative and cross-links render', () => {
  const page = read('../pages/LiveTenantReadinessView.tsx')
  for (const text of ['RECOMMENDATION_EVIDENCE', 'TRUST_EVIDENCE', 'APPROVAL_EVIDENCE', 'PRE_STATE_EVIDENCE', 'POST_STATE_EVIDENCE', 'VERIFICATION_EVIDENCE', 'OUTCOME_EVIDENCE', 'PROTECTION_EVIDENCE', 'DRIFT_EVIDENCE', 'Deterministic Narrative', 'This tenant is', 'Three certified wedges are available: M365, AI Economic Control and ServiceNow Execution.', 'Open Workspace', 'Open Connectors', 'Open Action Center', 'Open Approval Center', 'Open Evidence Packs', 'Open Outcome Protection']) assert.equal(page.includes(text), true)
})

test('demo fallback works and prohibited labels are absent', () => {
  const page = read('../pages/LiveTenantReadinessView.tsx') + read('../hooks/useLiveTenantReadinessData.ts')
  assert.equal(page.includes('Demo fallback data'), true)
  assert.equal(page.includes('Runtime APIs unavailable. Showing demo fallback data.'), true)
  assert.equal(page.includes('LeftShield'), false)
  assert.equal(page.includes('Agent Security Analytics'), false)
})
