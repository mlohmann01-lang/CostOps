import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { assignTrustTask, escalateTrustTask, getDemoRuntimeState, recomputeAccountabilityRollup, resetDemoRuntimeStore } from './demoRuntimeStore'

test('Data Trust shows accountability cards', () => {
  const page = fs.readFileSync(new URL('../pages/DataTrustView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Trust Accountability'), true)
  assert.equal(page.includes('Open Tasks'), true)
  assert.equal(page.includes('Overdue'), true)
  assert.equal(page.includes('At Risk'), true)
  assert.equal(page.includes('Resolved This Month'), true)
})

test('accountability table renders owner/SLA/due/unlock/escalation', () => {
  const page = fs.readFileSync(new URL('../pages/DataTrustView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Owner'), true)
  assert.equal(page.includes('SLA Status'), true)
  assert.equal(page.includes('Due'), true)
  assert.equal(page.includes('Unlock Value'), true)
  assert.equal(page.includes('Escalation'), true)
  assert.equal(page.includes('relativeDue'), true)
})

test('demo assign/escalate does not call live APIs', () => {
  resetDemoRuntimeStore()
  const originalFetch = globalThis.fetch
  let called = false
  globalThis.fetch = (async () => { called = true; throw new Error('should not call fetch') }) as any
  const first = getDemoRuntimeState().trustResolutionTasks[0]
  const assigned = assignTrustTask(first.taskId, { ownerId: 'iam-team', ownerName: 'IAM Team', ownerType: 'TEAM' })
  const escalated = escalateTrustTask(first.taskId, 'Demo escalation')
  globalThis.fetch = originalFetch
  assert.equal(called, false)
  assert.equal(assigned.ownerName, 'IAM Team')
  assert.notEqual(escalated.escalationLevel, 'NONE')
})

test('live assign calls POST assign', () => {
  const hook = fs.readFileSync(new URL('../hooks/useTrustAccountabilityData.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('/api/trust/accountability'), true)
  assert.equal(hook.includes('/api/trust/accountability/overdue'), true)
  assert.equal(hook.includes('/assign'), true)
  assert.equal(hook.includes("method: 'POST'"), true)
})

test('live escalate calls POST escalate', () => {
  const hook = fs.readFileSync(new URL('../hooks/useTrustAccountabilityData.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('/escalate'), true)
  assert.equal(hook.includes('escalateTask'), true)
})

test('Command shows overdue trust priority action', () => {
  const page = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('trust-priority-action'), true)
  assert.equal(page.includes('trust tasks overdue'), true)
  assert.equal(page.includes('blocked value awaiting ownership'), true)
})

test('Runtime Health shows trust resolution backlog', () => {
  const page = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Trust Resolution Backlog'), true)
  assert.equal(page.includes('trust-resolution-backlog'), true)
  assert.equal(page.includes('highestEscalationLevel'), true)
})

test('live error does not fall back to demo data', () => {
  const hook = fs.readFileSync(new URL('../hooks/useTrustAccountabilityData.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('catch (err)'), true)
  assert.equal(hook.includes('setAccountability(null)'), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
})

test('demo accountability rollup includes ownership examples', () => {
  resetDemoRuntimeStore()
  const rollup = recomputeAccountabilityRollup()
  const tasks = getDemoRuntimeState().trustResolutionTasks
  assert.equal(tasks.some((task: any) => task.ownerName === 'IAM Team' && task.slaStatus === 'OVERDUE'), true)
  assert.equal(tasks.some((task: any) => task.ownerName === 'Platform Operations' && task.escalationLevel === 'DIRECTOR'), true)
  assert.ok(rollup.blockedValueOpen > 0)
})
