import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { actionCenterLifecycleTabs, actionCenterTransitionChoices, getNextActionLabel } from '../pages/ActionCenter'
import { actionCenterApiPaths, demoActionCenterData, demoReadinessReports, readinessDimensionOrder, summarizeActions, summarizeReadinessReports, type GovernedAction } from '../hooks/useActionCenterData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const action = (status: GovernedAction['status'], readiness: GovernedAction['readiness'] = 'ELIGIBLE'): Pick<GovernedAction, 'status' | 'readiness'> => ({ status, readiness })

test('/actions route exists and visible Command navigation includes Actions', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import ActionCenter from './pages/ActionCenter'"), true)
  assert.equal(app.includes('<Route path="/actions" component={ActionsRoute} />'), true)
  assert.equal(app.includes('<ActionCenter />'), true)
  const command = NAV_GROUPS.find((group) => group.label === 'Command')
  assert.equal(command?.items.some((item) => item.label === 'Actions' && item.href === '/actions'), true)
})

test('Action Center renders required summary cards', () => {
  const page = read('../pages/ActionCenter.tsx')
  for (const label of ['Action Center', 'Governed action lifecycle from approval to execution, verification, retained value and drift.', 'Ready', 'Awaiting Approval', 'In Execution', 'Verification', 'Verified', 'Retained', 'Drifted', 'Projected Value', 'Verified Value']) assert.equal(page.includes(label), true)
  assert.equal(page.includes("data-testid='action-center-summary'"), true)
})

test('lifecycle tabs render Ready, Approval, Execution, Verification, Outcomes, Closed', () => {
  assert.deepEqual(actionCenterLifecycleTabs.map((tab) => tab.label), ['Ready', 'Approval', 'Execution', 'Verification', 'Outcomes', 'Closed'])
  assert.deepEqual(actionCenterLifecycleTabs.find((tab) => tab.label === 'Execution')?.statuses, ['APPROVED', 'QUEUED', 'EXECUTING'])
  assert.deepEqual(actionCenterLifecycleTabs.find((tab) => tab.label === 'Closed')?.statuses, ['CLOSED', 'REJECTED', 'CANCELLED'])
})

test('actions are grouped into the correct lifecycle tabs', () => {
  const grouped = Object.fromEntries(actionCenterLifecycleTabs.map((tab) => [tab.label, demoActionCenterData.actions.filter((row) => tab.statuses.includes(row.status)).map((row) => row.id)]))
  assert.deepEqual(grouped.Ready, ['ga-ready-approval'])
  assert.deepEqual(grouped.Approval, ['ga-awaiting-approval'])
  assert.deepEqual(grouped.Execution, ['ga-executing'])
  assert.deepEqual(grouped.Verification, ['ga-verifying'])
  assert.deepEqual(grouped.Outcomes, ['ga-retained'])
  assert.equal(grouped.Closed.includes('ga-closed'), true)
  assert.equal(grouped.Closed.includes('ga-never-eligible'), true)
})

test('next-step labels are deterministic for key statuses', () => {
  assert.equal(getNextActionLabel(action('READY', 'APPROVAL_REQUIRED')), 'Submit for approval')
  assert.equal(getNextActionLabel(action('READY', 'ELIGIBLE')), 'Queue for execution')
  assert.equal(getNextActionLabel(action('AWAITING_APPROVAL')), 'Approve / Reject')
  assert.equal(getNextActionLabel(action('QUEUED')), 'Start execution')
  assert.equal(getNextActionLabel(action('EXECUTING')), 'Mark executed')
  assert.equal(getNextActionLabel(action('VERIFYING')), 'Verify / Mark drifted')
  assert.equal(getNextActionLabel(action('RETAINED')), 'Close / Mark drifted')
  assert.equal(getNextActionLabel(action('DRIFTED')), 'Reopen / Close')
  assert.equal(getNextActionLabel(action('CLOSED')), 'Closed')
})

test('demo fallback renders when API is unavailable', () => {
  const hook = read('../hooks/useActionCenterData.ts')
  assert.deepEqual(actionCenterApiPaths, ['/api/actions/dashboard', '/api/actions', '/api/trust-readiness/dashboard'])
  assert.equal(hook.includes("liveFetch<ActionCenterSummary>('/api/actions/dashboard')"), true)
  assert.equal(hook.includes("liveFetch<GovernedAction[]>('/api/actions')"), true)
  assert.equal(hook.includes("liveFetch<ReadinessDashboardSummary>('/api/trust-readiness/dashboard')"), true)
  assert.equal(hook.includes('const fallback = { ...demoActionCenterData, error: err.message }'), true)
  assert.equal(demoActionCenterData.isDemo, true)
  assert.equal(demoActionCenterData.actions.length > 0, true)
})

test('demo mode does not enable real execution actions', () => {
  const page = read('../pages/ActionCenter.tsx')
  assert.equal(page.includes('Demo Mode · Execution disabled · Sample governed action lifecycle data'), true)
  assert.equal(page.includes("disabled={isDemo || pending || blocked}"), true)
  for (const label of ['Simulated only', 'Controlled ServiceNow Execution', 'ServiceNow Artifact', 'ServiceNow Artifact State', 'ServiceNow Rollback', 'ServiceNow Verification', 'ServiceNow Protection', 'ServiceNow Drift', 'ServiceNow Executive Proof']) assert.equal(page.includes(label), true)
})

test('detail panel renders history and evidence fields', () => {
  const page = read('../pages/ActionCenter.tsx')
  for (const label of ['Description', 'Source Type', 'Source ID', 'Recommendation IDs', 'Evidence IDs', 'Outcome IDs', 'Created At', 'Updated At', 'Lifecycle History', 'Evidence Summary']) assert.equal(page.includes(label), true)
  const hook = read('../hooks/useActionCenterData.ts')
  assert.equal(hook.includes('`/api/actions/${actionId}/history`'), true)
  assert.equal(hook.includes('`/api/actions/${actionId}/evidence`'), true)
})

test('transition buttons call /api/actions/:id/transition', () => {
  const hook = read('../hooks/useActionCenterData.ts')
  assert.equal(hook.includes('`/api/actions/${actionId}/transition`'), true)
  assert.equal(hook.includes("method: 'POST'"), true)
  assert.equal(actionCenterTransitionChoices['Start execution'][0].targetStatus, 'EXECUTING')
  assert.equal(actionCenterTransitionChoices['Verify / Mark drifted'][1].targetStatus, 'DRIFTED')
})

test('after transition, data refresh is triggered', () => {
  const page = read('../pages/ActionCenter.tsx')
  const hook = read('../hooks/useActionCenterData.ts')
  assert.equal(page.includes('await transitionAction(action.id, targetStatus); await refresh()'), true)
  assert.equal(hook.includes('return refresh()'), true)
  const summary = summarizeActions(demoActionCenterData.actions)
  assert.equal(summary.ready, 1)
  assert.equal(summary.retained, 1)
})

test('No LeftShield or Agent Security Analytics labels appear', () => {
  const page = read('../pages/ActionCenter.tsx')
  const hook = read('../hooks/useActionCenterData.ts')
  assert.equal(page.includes('LeftShield'), false)
  assert.equal(hook.includes('LeftShield'), false)
  assert.equal(page.includes('Agent Security Analytics'), false)
  assert.equal(hook.includes('Agent Security Analytics'), false)
})


test('Trust & Readiness summary cards render', () => {
  const page = read('../pages/ActionCenter.tsx')
  for (const label of ['Eligible', 'Approval Required', 'Blocked', 'Never Eligible', 'High Confidence', 'Missing Evidence']) assert.equal(page.includes(`label='${label}'`), true)
  assert.equal(page.includes("data-testid='trust-readiness-summary'"), true)
  const summary = summarizeReadinessReports(demoReadinessReports)
  assert.equal(summary.eligible >= 1, true)
  assert.equal(summary.approvalRequired >= 1, true)
  assert.equal(summary.blocked >= 1, true)
  assert.equal(summary.neverEligible >= 1, true)
})

test('authority verdict and confidence badges appear on action cards', () => {
  const page = read('../pages/ActionCenter.tsx')
  assert.equal(page.includes("<AuthorityBadge label='Authority'"), true)
  assert.equal(page.includes("<AuthorityBadge label='Confidence'"), true)
  assert.equal(page.includes("<AuthorityBadge label='Blockers'"), true)
  assert.equal(page.includes("<AuthorityBadge label='Required Actions'"), true)
})

test('detail panel renders Trust & Readiness section with all nine dimensions', () => {
  const page = read('../pages/ActionCenter.tsx')
  assert.equal(page.includes('Trust & Readiness Authority'), true)
  assert.equal(page.includes('Dimension Breakdown'), true)
  assert.deepEqual(readinessDimensionOrder, ['IDENTITY_TRUST', 'USAGE_TRUST', 'OWNERSHIP_TRUST', 'FINANCIAL_TRUST', 'CONNECTOR_TRUST', 'APPROVAL_TRUST', 'ROLLBACK_TRUST', 'EXECUTION_TRUST', 'EVIDENCE_TRUST'])
})

test('blockers, missing evidence, and required actions render with empty states', () => {
  const page = read('../pages/ActionCenter.tsx')
  for (const label of ['Blockers', 'Missing Evidence', 'Required Actions', 'No blockers.', 'No missing evidence.', 'No required readiness actions.']) assert.equal(page.includes(label), true)
})

test('Evaluate Readiness posts and refreshes action data plus readiness dashboard', () => {
  const hook = read('../hooks/useActionCenterData.ts')
  const page = read('../pages/ActionCenter.tsx')
  assert.equal(hook.includes('`/api/trust-readiness/actions/${actionId}/evaluate`'), true)
  assert.equal(hook.includes("method: 'POST'"), true)
  assert.equal(hook.includes("liveFetch<ReadinessDashboardSummary>('/api/trust-readiness/dashboard')"), true)
  assert.equal(page.includes('const readinessReport = await evaluateReadiness(action.id)'), true)
  assert.equal(page.includes('await refresh()'), true)
})

test('Demo mode disables Evaluate Readiness', () => {
  const page = read('../pages/ActionCenter.tsx')
  assert.equal(page.includes('Evaluate Readiness'), true)
  assert.equal(page.includes("isDemo ? 'Demo only'"), true)
  assert.equal(page.includes('disabled={isDemo || pendingEvaluate}'), true)
})

test('Blocked and Never Eligible actions do not expose execution controls', () => {
  const page = read('../pages/ActionCenter.tsx')
  assert.equal(page.includes('Blocked by Trust & Readiness Authority'), true)
  assert.equal(page.includes("verdict === 'BLOCKED' || verdict === 'NEVER_ELIGIBLE' || verdict === 'APPROVAL_REQUIRED'"), true)
  assert.equal(demoActionCenterData.actions.some((action) => action.readinessAuthorityVerdict === 'BLOCKED'), true)
  assert.equal(demoActionCenterData.actions.some((action) => action.readinessAuthorityVerdict === 'NEVER_ELIGIBLE'), true)
})
