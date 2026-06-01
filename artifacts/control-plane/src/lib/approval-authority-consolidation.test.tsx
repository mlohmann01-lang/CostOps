import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiveDataError } from '../components/shared/Foundation'
import { normalizeApprovalWorkflows, normalizeRecommendations } from './liveNormalizers'
import { submitRecommendationForApproval } from './recommendationApprovalBridge'

test('Recommendations submit approval still calls existing recommendation endpoint', async () => {
  let url = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => { url = String(input); return new Response(JSON.stringify({ workflowId: 'wf_a2', approvalState: 'PENDING_APPROVAL', sourceSystem: 'APPROVAL_WORKFLOW' }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
  await submitRecommendationForApproval('rec-a2-ui')
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/recommendations/rec-a2-ui/submit-approval')
})

test('Approval Workflows normalizer shows canonical state and source', () => {
  const data = normalizeApprovalWorkflows({ approvals: [{ workflowId: 'wf_a2', targetType: 'RECOMMENDATION', targetId: 'rec-a2-ui', approvalState: 'PENDING', currentStage: 'Owner approval', requiredRoles: ['OWNER'], sourceSystem: 'APPROVAL_WORKFLOW' }] })
  assert.equal(data.pending.length, 1)
  assert.equal(data.pending[0].stage, 'Owner approval')
  assert.equal(data.pending[0].sourceSystem, 'APPROVAL_WORKFLOW')
})

test('Command approval action reflects canonical pending state and no legacy label conflict', () => {
  const rows = normalizeRecommendations({ recommendations: [{ recommendationId: 'rec-a2-ui', title: 'Rightsize', projectedMonthlySavings: 1, readiness: 'APPROVAL_REQUIRED', approvalWorkflowId: 'wf_a2', approvalState: 'PENDING_APPROVAL' }] })
  assert.equal(rows[0].verdict, 'approval-required')
  const command = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  const approvals = fs.readFileSync(new URL('../pages/ApprovalWorkflowsView.tsx', import.meta.url), 'utf8')
  assert.equal(command.includes('Approval pending'), true)
  assert.equal(approvals.includes('Approval authority: Workflow'), true)
  assert.equal(approvals.includes('LEGACY_APPROVAL_REQUEST'), false)
})

test('live approval API wiring uses canonical authority in live mode while demo remains demo-only', () => {
  const hook = fs.readFileSync(new URL('../hooks/useApprovalWorkflowsData.ts', import.meta.url), 'utf8')
  const page = fs.readFileSync(new URL('../pages/ApprovalWorkflowsView.tsx', import.meta.url), 'utf8')
  assert.equal(hook.includes('/api/approval-authority'), true)
  assert.equal(page.includes('/api/approval-authority/workflows/'), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(page.includes('simulateApprove'), true)
})

test('live error does not fall back to demo data', () => {
  const html = renderToStaticMarkup(<LiveDataError error={new Error('approval authority failed')} onRetry={() => undefined} />)
  const page = fs.readFileSync(new URL('../pages/ApprovalWorkflowsView.tsx', import.meta.url), 'utf8')
  assert.match(html, /Live data unavailable/)
  assert.equal(page.includes('Live data unavailable'), true)
  assert.equal(page.includes('Snowflake auto-suspend verified'), false)
})
