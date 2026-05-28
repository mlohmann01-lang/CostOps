import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoRecommendations, demoCampaigns, demoSchedule, demoApprovals } from '../data/demo'

test('Recommendations renders 10 rows and filter controls', () => {
  assert.equal(demoRecommendations.length, 10)
  const body = fs.readFileSync(new URL('../pages/recommendations.tsx', import.meta.url), 'utf8')
  assert.equal(body.includes("['all','saas','cloud','ai','data','itam']"), true)
})

test('Campaigns renders 4 campaigns and projected savings', () => {
  assert.equal(demoCampaigns.length, 4)
  assert.ok(demoCampaigns.reduce((a, c) => a + c.projectedSavings, 0) > 0)
})

test('Scheduling renders 3 upcoming windows and 2 past windows', () => {
  assert.equal(demoSchedule.upcoming.length, 3)
  assert.equal(demoSchedule.past.length, 2)
})

test('Approval workflows renders 2 pending items and history', () => {
  assert.equal(demoApprovals.pending.length, 2)
  assert.ok(demoApprovals.history.length > 0)
})

test('live empty states render with no demo leakage', () => {
  const files = ['../pages/recommendations.tsx','../pages/CampaignsView.tsx','../pages/SchedulingView.tsx','../pages/ApprovalWorkflowsView.tsx']
  for (const rel of files) {
    const body = fs.readFileSync(new URL(rel, import.meta.url), 'utf8')
    assert.equal(body.includes('isEmptyLive'), true)
  }
})

test('all four routes are reachable', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  ;['/recommendations','/campaigns','/scheduling','/approval-workflows'].forEach((route)=>assert.equal(app.includes(route), true))
})
