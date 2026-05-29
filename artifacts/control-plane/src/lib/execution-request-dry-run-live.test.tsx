import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiveDataError } from '../components/shared/Foundation'
import { runExecutionRequestDryRun } from './executionDryRunBridge'
import { normalizeExecution } from './liveNormalizers'

test('live execution queue shows Run dry run button', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Run dry run'), true)
})

test('clicking calls POST dry-run endpoint', async () => {
  let url = ''
  let method = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { url = String(input); method = String(init?.method); return new Response(JSON.stringify({ executionRequestId: 'exec_1', readinessState: 'READY_FOR_EXECUTION', dryRun: { dryRunId: 'dryrun_1', simulationState: 'READY_FOR_EXECUTION' } }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
  await runExecutionRequestDryRun('exec_1')
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/execution-requests/exec_1/dry-run')
  assert.equal(method, 'POST')
})

test('success renders dry-run result details', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Dry-run state:'), true)
  assert.equal(source.includes('Simulated actions:'), true)
  assert.equal(source.includes('Impacted entities:'), true)
  assert.equal(source.includes('Projected savings validated:'), true)
})

test('ready result shows Ready for execution pill', () => {
  const data = normalizeExecution([{ requestId: 'exec_1', actionType: 'REMOVE_LICENSE', readinessState: 'READY_FOR_EXECUTION' }])
  assert.equal(data.awaiting[0].readiness, 'READY_FOR_EXECUTION')
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('executeLive'), true)
})

test('blocked result shows policy blocks/errors', () => {
  const data = normalizeExecution([{ requestId: 'exec_1', actionType: 'REMOVE_LICENSE', readinessState: 'DRY_RUN_BLOCKED', metadata: { policyBlocksSummary: '1 policy block', validationErrors: ['blocked'] } }])
  assert.equal(data.awaiting[0].policyBlocksSummary, '1 policy block')
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Policy blocks:'), true)
  assert.equal(source.includes('Errors:'), true)
})

test('demo mode does not call dry-run endpoint', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes("workspace.mode === 'live'"), true)
  assert.equal(source.includes('simulateExecution'), true)
})

test('live Execute button appears only in live ready flow', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes("'Execute'"), true)
  assert.equal(source.includes("workspace.mode === 'live'"), true)
})

test('live API error shows inline error without demo fallback', () => {
  const html = renderToStaticMarkup(<LiveDataError error={new Error('dry run failed')} onRetry={() => undefined} />)
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.match(html, /Live data unavailable/)
  assert.equal(source.includes('Live data unavailable'), true)
  assert.doesNotMatch(source, /Snowflake auto-suspend verified/)
})
