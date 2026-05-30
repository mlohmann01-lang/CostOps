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
  assert.equal(sidebar.includes('Renewals'), true)
  assert.equal(sidebar.includes('OPERATIONAL'), true)
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
  const command = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  assert.equal(command.includes('Upcoming Renewals Requiring Action'), true)
  assert.equal(command.includes('renewal-priority-actions'), true)
  assert.equal(command.includes('/renewals'), true)
})
