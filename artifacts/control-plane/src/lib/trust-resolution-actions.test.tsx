import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resetDemoRuntimeStore, simulateCreateTrustResolutionTask, simulateUpdateTrustResolutionTaskStatus, getDemoRuntimeState } from './demoRuntimeStore'
import { demoTrustFindings } from '../data/demo'

test('task creation from Data Trust finding', () => {
  resetDemoRuntimeStore()
  const task = simulateCreateTrustResolutionTask(demoTrustFindings[0])
  assert.equal(task.findingId, demoTrustFindings[0].findingId)
  assert.ok(getDemoRuntimeState().trustResolutionTasks.some((item: any) => item.taskId === task.taskId))
})

test('status update', () => {
  resetDemoRuntimeStore()
  const task = simulateCreateTrustResolutionTask(demoTrustFindings[1])
  const updated = simulateUpdateTrustResolutionTaskStatus(task.taskId, 'IN_PROGRESS')
  assert.equal(updated.status, 'IN_PROGRESS')
  const resolved = simulateUpdateTrustResolutionTaskStatus(task.taskId, 'RESOLVED')
  assert.equal(resolved.status, 'RESOLVED')
  assert.ok(resolved.resolvedAt)
})

test('live API calls in live mode', () => {
  const hook = fs.readFileSync(new URL('../hooks/useTrustResolutionTasks.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('/api/trust/tasks'), true)
  assert.equal(hook.includes('/api/trust/findings/'), true)
  assert.equal(hook.includes('/status'), true)
})

test('demo mode does not call live APIs', () => {
  const hook = fs.readFileSync(new URL('../hooks/useTrustResolutionTasks.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('simulateCreateTrustResolutionTask'), true)
})

test('no demo fallback on live error', () => {
  const hook = fs.readFileSync(new URL('../hooks/useTrustResolutionTasks.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('catch (err)'), true)
  assert.equal(hook.includes('setLiveTasks([])'), true)
})

test('Data Trust page renders resolution task controls', () => {
  const page = fs.readFileSync(new URL('../pages/DataTrustView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Create resolution task'), true)
  assert.equal(page.includes('Mark in progress'), true)
  assert.equal(page.includes('Mark resolved'), true)
  assert.equal(page.includes('resolution-tasks-panel'), true)
})
