import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { submitRecommendationForApproval } from './recommendationApprovalBridge'
import { normalizeRecommendations, normalizeApprovalWorkflows } from './liveNormalizers'
import { LiveDataError } from '../components/shared/Foundation'

test('live approval-required recommendation shows Submit for approval', () => {
  const rows = normalizeRecommendations({ recommendations: [{ recommendationId: 'rec-submit', actionType: 'RIGHTSIZE_LICENSE', targetEntityId: 'u1', executionReadiness: 'APPROVAL_REQUIRED', projectedMonthlySavings: 10 }] })
  assert.equal(rows[0].verdict, 'approval-required')
  const source = fs.readFileSync(new URL('../pages/recommendations.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Submit for approval'), true)
})

test('clicking live submit calls POST endpoint', async () => {
  let url = ''
  let method = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { url = String(input); method = String(init?.method); return new Response(JSON.stringify({ recommendationId: 'rec-submit', workflowId: 'wf_1', approvalState: 'PENDING_APPROVAL', currentStage: 'Owner approval', requiredRoles: ['OWNER'], submittedAt: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
  await submitRecommendationForApproval('rec-submit')
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/recommendations/rec-submit/submit-approval')
  assert.equal(method, 'POST')
})

test('success changes UI to Approval pending or refreshes row', () => {
  const source = fs.readFileSync(new URL('../pages/recommendations.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Approval workflow created'), true)
  assert.equal(source.includes('Approval pending'), true)
  const bridge = fs.readFileSync(new URL('./recommendationApprovalBridge.ts', import.meta.url), 'utf8')
  assert.equal(bridge.includes('certen:live-read-refresh'), true)
})

test('approval workflow page receives refreshed workflow data', () => {
  const data = normalizeApprovalWorkflows([{ workflowId: 'wf_1', targetId: 'rec-submit', workflowName: 'RIGHTSIZE_LICENSE approval', approvalState: 'PENDING_APPROVAL', currentStage: 0, approvalStages: [{ stageName: 'Owner approval' }], requiredRoles: ['OWNER'] }])
  assert.equal(data.pending.length, 1)
  assert.equal(data.pending[0].actionId, 'rec-submit')
})

test('demo mode does not call POST endpoint', () => {
  const command = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  assert.equal(command.includes("workspace.mode === 'demo'"), true)
  assert.equal(command.includes('simulateSubmitForApproval'), true)
})

test('live error shows inline error and no demo fallback', () => {
  const html = renderToStaticMarkup(<LiveDataError error={new Error('approval failed')} onRetry={() => undefined} />)
  const source = fs.readFileSync(new URL('../pages/recommendations.tsx', import.meta.url), 'utf8')
  assert.match(html, /Live data unavailable/)
  assert.equal(source.includes('Live data unavailable'), true)
  assert.doesNotMatch(source, /Snowflake auto-suspend verified/)
})

test('no execution or dry-run calls made', () => {
  const source = fs.readFileSync(new URL('./recommendationApprovalBridge.ts', import.meta.url), 'utf8')
  assert.equal(source.includes('/execution'), false)
  assert.equal(source.includes('dry-run'), false)
})
