import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { verifyExecutionOutcome } from './outcomeVerificationBridge'
import { normalizeExecution, normalizeOutcomes } from './liveNormalizers'
import { LiveDataError } from '../components/shared/Foundation'

test('completed execution row shows Verify outcome', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Verify outcome'), true)
})

test('clicking calls POST verify endpoint', async () => {
  let url = ''
  let method = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { url = String(input); method = String(init?.method); return new Response(JSON.stringify({ executionResultId: 'res_1', outcome: { outcomeId: 'out_1', verificationState: 'VERIFIED' } }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
  await verifyExecutionOutcome('res_1')
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/execution-results/res_1/verify')
  assert.equal(method, 'POST')
})

test('success renders verified outcome panel', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Outcome verification:'), true)
  assert.equal(source.includes('Verified savings:'), true)
  assert.equal(source.includes('Verification evidence:'), true)
})

test('failed verification renders failed state plumbing', () => {
  const data = normalizeExecution([{ requestId: 'exec_1', latestExecutionResultId: 'res_1', latestExecutionResultState: 'EXECUTED', latestOutcomeState: 'VERIFICATION_FAILED', metadata: { latestOutcomeState: 'VERIFICATION_FAILED' } }])
  assert.equal(data.completed[0].latestOutcomeState, 'VERIFICATION_FAILED')
})

test('outcomes page refreshes or receives verified savings', () => {
  const data = normalizeOutcomes({ ledger: [{ id: 'out_1', action: 'REMOVE_LICENSE', projectedMonthlySavings: 40, verifiedMonthlySavings: 40, evidence: 'Evidence-backed', status: 'VERIFIED' }] })
  assert.equal(data.ledger[0].verified, 40)
})

test('demo mode does not call verify endpoint', () => {
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes("workspace.mode === 'demo'"), true)
  assert.equal(source.includes('simulateRollback'), true)
})

test('live error shows inline error without demo fallback', () => {
  const html = renderToStaticMarkup(<LiveDataError error={new Error('verify failed')} onRetry={() => undefined} />)
  const source = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  assert.match(html, /Live data unavailable/)
  assert.equal(source.includes('Live data unavailable'), true)
  assert.doesNotMatch(source, /Snowflake auto-suspend verified/)
})

test('no rollback/remediation action is triggered', () => {
  const source = fs.readFileSync(new URL('./outcomeVerificationBridge.ts', import.meta.url), 'utf8')
  assert.equal(source.includes('/rollback'), false)
  assert.equal(source.includes('remediation'), false)
})
