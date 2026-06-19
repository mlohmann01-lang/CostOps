import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmptyState, LiveDataError } from '../components/shared/Foundation'
import { generateM365LiveRecommendations } from '../pages/ConnectorHub'
import { normalizeRecommendations } from './liveNormalizers'

test('live Connector Hub M365 action calls generate endpoint', async () => {
  let url = ''
  let method = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => { url = String(input); method = String(init?.method); return new Response(JSON.stringify({ scannedUsers: 1, recommendationsCreated: 1 }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
  await generateM365LiveRecommendations()
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/playbooks/m365/generate-recommendations')
  assert.equal(method, 'POST')
})

test('demo mode does not call generate endpoint', () => {
  const source = fs.readFileSync(new URL('../pages/ConnectorHub.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes("workspace.mode === 'demo'"), true)
  assert.equal(source.includes("workspace.mode === 'live' && c.id === 'm365'"), true)
})

test('successful generate refreshes or surfaces updated recommendations', () => {
  // ConnectorHub.tsx now drives its notices through a generic runLive(label, path) helper that
  // builds the "<label> complete" string at runtime via template literal, so the full literal
  // phrase no longer appears verbatim in source. Assert the label text and the templated
  // completion suffix instead, which together produce the same "M365 governance evaluation
  // complete" notice this test originally guarded.
  const source = fs.readFileSync(new URL('../pages/ConnectorHub.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('certen:live-read-refresh'), true)
  assert.equal(source.includes("'M365 governance evaluation'"), true)
  assert.equal(source.includes('${label} complete'), true)
  const rows = normalizeRecommendations({ recommendations: [{ recommendationId: 'tenant:M365_RIGHTSIZE_LICENSE_V1:user-1:E5:abc', playbookId: 'M365_RIGHTSIZE_LICENSE_V1', actionType: 'RIGHTSIZE_LICENSE', targetEntityId: 'user-1', projectedMonthlySavings: 21, executionReadiness: 'APPROVAL_REQUIRED' }] })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'tenant:M365_RIGHTSIZE_LICENSE_V1:user-1:E5:abc')
  assert.match(rows[0].action, /RIGHTSIZE_LICENSE/)
  assert.equal(rows[0].domain, 'saas')
  assert.equal(rows[0].verdict, 'approval-required')
})

test('live no-data message renders', () => {
  const html = renderToStaticMarkup(<EmptyState title='No recommendations yet' description='No recommendations yet — run your first M365 governance evaluation.' />)
  const source = fs.readFileSync(new URL('../pages/ConnectorHub.tsx', import.meta.url), 'utf8')
  assert.match(html, /run your first M365 governance evaluation/)
  assert.equal(source.includes('M365 connected but no usage/licence data has been ingested yet'), true)
})

test('live errors render without demo fallback', () => {
  const html = renderToStaticMarkup(<LiveDataError error={new Error('M365 generation failed')} onRetry={() => undefined} />)
  assert.match(html, /Live data unavailable/)
  assert.doesNotMatch(html, /Snowflake auto-suspend verified/)
})
