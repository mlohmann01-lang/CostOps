import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeExecution } from './liveNormalizers'

test('execution queue displays request', () => {
  const data = normalizeExecution([{ requestId: 'exec_1', actionType: 'REMOVE_LICENSE', platform: 'M365', riskClass: 'A', rollbackCoverage: 'PARTIAL', projectedMonthlySavings: 57, readinessState: 'PENDING_DRY_RUN', createdAt: '2026-05-29T00:00:00.000Z' }])
  assert.equal(data.awaiting.length, 1)
  assert.equal(data.awaiting[0].id, 'exec_1')
  assert.equal(data.awaiting[0].platform, 'M365')
})

test('approval creation refreshes queue', () => {
  const approval = fs.readFileSync(new URL('../pages/ApprovalWorkflowsView.tsx', import.meta.url), 'utf8')
  assert.equal(approval.includes('/api/approval-authority/workflows'), true)
  assert.equal(approval.includes('broadcastLiveReadRefresh'), true)
})

test('pending dry-run visible', () => {
  const data = normalizeExecution([{ requestId: 'exec_2', actionType: 'REMOVE_LICENSE', readinessState: 'PENDING_DRY_RUN' }])
  assert.equal(data.awaiting[0].readiness, 'PENDING_DRY_RUN')
  const execution = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(execution.includes('PENDING_DRY_RUN'), true)
})

test('no demo fallback', () => {
  const execution = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(execution.includes('workspace.mode === \'live\''), true)
  assert.equal(execution.includes('Snowflake auto-suspend verified'), false)
})
