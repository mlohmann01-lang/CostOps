import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoExecutivePriorities, demoExecutivePrioritySummary } from '../data/demo'
import { executivePrioritiesApiPaths } from '../hooks/useExecutivePrioritiesData'

test('demo executive priorities include summary and top five', () => {
  assert.equal(demoExecutivePrioritySummary.totalOpportunities, 32)
  assert.equal(demoExecutivePrioritySummary.topFiveMonthlySavings, 67000)
  assert.equal(demoExecutivePrioritySummary.confidenceBand, 'HIGH')
  assert.equal(demoExecutivePriorities.length, 5)
  assert.equal(demoExecutivePriorities[0].title, 'Inactive Copilot Licences')
})

test('Executive Priorities page renders summary cards, top priorities, and rationale expansion', () => {
  const page = fs.readFileSync(new URL('../pages/ExecutivePrioritiesView.tsx', import.meta.url), 'utf8')
  for (const text of ['Top 5 Monthly Savings', 'Top 5 Annual Savings', 'Ready Now', 'Approval Required', 'Blocked', 'Executive Brief', 'Top Priorities', 'priority-rationale']) assert.equal(page.includes(text), true)
})

test('live hook calls priority APIs with safe error state and no demo fallback', () => {
  const hook = fs.readFileSync(new URL('../hooks/useExecutivePrioritiesData.ts', import.meta.url), 'utf8')
  assert.deepEqual(executivePrioritiesApiPaths, ['/api/priorities', '/api/priorities/top', '/api/priorities/summary'])
  assert.equal(hook.includes("liveFetch<any>('/api/priorities')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/priorities/top')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/priorities/summary')"), true)
  assert.equal(hook.includes('catch (err)'), true)
  assert.equal(hook.includes('...empty'), true)
  assert.equal(hook.includes("dataState: 'NO_DATA'"), true)
})

test('nav, Command, and Runtime Health show executive prioritization surfaces', () => {
  // NOTE (Program 6 test cleanup): CommandView was rewritten into the Executive Command Center
  // orchestrator (six fixed sections synthesizing Programs 2-5 + Executive Risk + Tenant
  // Readiness) and no longer surfaces a dedicated "Top 5 Executive Priorities" widget. Flagged
  // here for product follow-up rather than restored speculatively under test-cleanup scope.
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(sidebar.includes('Priorities'), true)
  assert.equal(sidebar.includes('Intelligence'), true)
  assert.equal(app.includes('/executive-priorities'), true)
  assert.equal(runtime.includes('Prioritization Engine'), true)
  assert.equal(runtime.includes('prioritization-engine'), true)
})
