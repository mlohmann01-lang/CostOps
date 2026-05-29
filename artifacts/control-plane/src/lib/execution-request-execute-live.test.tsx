import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { executeExecutionRequest } from './executionRunBridge'
import { normalizeExecution } from './liveNormalizers'

test('live execution queue shows Execute for ready requests', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes("'Execute'"), true)
  assert.equal(source.includes('executeLive'), true)
})

test('clicking execute bridge calls POST execute endpoint', async () => {
  let url = ''
  let method = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { url = String(input); method = String(init?.method); return new Response(JSON.stringify({ executionRequestId: 'exec_1', executionState: 'EXECUTED', result: { executionResultId: 'res_1', executionState: 'EXECUTED', executedActions: [{ action: 'REMOVE_LICENSE' }], executionEvidence: ['ev1'] } }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
  await executeExecutionRequest('exec_1')
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/execution-requests/exec_1/execute')
  assert.equal(method, 'POST')
})

test('execution result details render in Execution page source', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Execution result:'), true)
  assert.equal(source.includes('Executed actions:'), true)
  assert.equal(source.includes('Execution evidence:'), true)
  assert.equal(source.includes('Rollback reference:'), true)
})

test('executed request normalizes into completed section', () => {
  const data = normalizeExecution([{ requestId: 'exec_1', actionType: 'REMOVE_LICENSE', latestExecutionResultId: 'res_1', latestExecutionResultState: 'EXECUTED', projectedMonthlySavings: 30 }])
  assert.equal(data.awaiting.length, 0)
  assert.equal(data.completed.length, 1)
  assert.equal(data.completed[0].certId, 'res_1')
})

test('demo mode still uses simulated execution and not execute endpoint', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('simulateExecution'), true)
  assert.equal(source.includes("workspace.mode === 'live'"), true)
})
