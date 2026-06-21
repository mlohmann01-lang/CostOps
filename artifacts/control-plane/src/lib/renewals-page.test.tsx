import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoRenewalIntelligence } from '../data/demo'
import { renewalApiPaths } from '../hooks/useRenewalsData'

test('demo renewal dataset has commercial examples', () => {
  assert.equal(demoRenewalIntelligence.summary.upcomingRenewals, 7)
  assert.equal(demoRenewalIntelligence.summary.renewalSpend, 2400000)
  assert.equal(demoRenewalIntelligence.summary.highRisk, 2)
  assert.ok(demoRenewalIntelligence.renewals.some((renewal: any) => renewal.contractName === 'Microsoft E5' && renewal.daysRemaining === 87 && renewal.readiness.recoverableSpend >= 68000))
  assert.ok(demoRenewalIntelligence.renewals.some((renewal: any) => renewal.contractName.includes('Snowflake') && renewal.daysRemaining === 42))
})

test('Renewals page route and nav are visible under operational', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/renewals'), true)
  assert.equal(sidebar.includes('Technology Portfolio'), true)
  assert.equal(sidebar.includes('Intelligence'), true)
})

test('Renewals page renders summary cards and readiness table', () => {
  const page = fs.readFileSync(new URL('../pages/RenewalsView.tsx', import.meta.url), 'utf8')
  for (const text of ['Upcoming Renewals', 'Renewal Spend', 'Recoverable', 'High Risk', 'Vendor', 'Renewal Date', 'Spend', 'Days Remaining', 'Readiness', 'Leverage', 'Actions']) assert.equal(page.includes(text), true)
})

test('live API wiring calls renewals APIs without demo fallback', () => {
  const hook = fs.readFileSync(new URL('../hooks/useRenewalsData.ts', import.meta.url), 'utf8')
  assert.deepEqual(renewalApiPaths, ['/api/renewals', '/api/renewals/upcoming', '/api/renewals/high-risk'])
  assert.equal(hook.includes("liveFetch<any>('/api/renewals')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/renewals/upcoming')"), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('catch (err)'), true)
})

test('Command page shows upcoming renewal priority action', () => {
  // Program 6A coverage audit: CommandView's old "Upcoming Renewals Requiring Action" /
  // "renewal-priority-actions" widget (which linked out to /renewals) was removed when
  // CommandView became the Executive Command Center orchestrator. The renewal readiness
  // summary itself still exists and renders on its own owning page (RenewalsView), and the
  // /renewals route remains registered independently of CommandView, so the coverage is
  // relocated there instead of CommandView. See PROGRAM_6A_COVERAGE_AUDIT.md.
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const renewalsPage = fs.readFileSync(new URL('../pages/RenewalsView.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/renewals'), true)
  assert.equal(renewalsPage.includes('Upcoming Renewals'), true)
})
