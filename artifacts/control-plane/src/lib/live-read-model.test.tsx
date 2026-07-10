import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmptyState, LiveDataError } from '../components/shared/Foundation'
import { RuntimeActivityList } from '../components/shared/RuntimeActivityList'
import { liveFetch } from './liveApi'
import { normalizeCommandAggregate, normalizeConnectorOps, normalizeRecommendations } from './liveNormalizers'
import { subscribeRuntimeEvents } from './liveRuntimeEvents'
import type { WorkspaceContext } from '../types/workspace'

const demoWorkspace: WorkspaceContext = { mode: 'demo', tenantId: 'demo-sandbox-tenant', tenantName: 'Demo workspace', dataReady: true, runtimeState: 'DEMO', connectedCount: 0 }
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('demo mode does not call live APIs', async () => {
  let calls = 0
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => { calls += 1; return new Response('[]') }) as typeof fetch
  const unsubscribe = subscribeRuntimeEvents({ workspace: demoWorkspace, onEvents: () => undefined, intervalMs: 5 })
  await wait(20)
  unsubscribe()
  globalThis.fetch = previousFetch
  assert.equal(calls, 0)
})

test('live mode calls /api/recommendations for recommendations', async () => {
  let url = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => { url = String(input); return new Response(JSON.stringify({ recommendations: [] }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
  await liveFetch('/api/recommendations')
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/recommendations')
})

test('live mode calls /api/outcomes/ledger/summary for outcomes', async () => {
  let url = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => { url = String(input); return new Response(JSON.stringify({ projectedMonthlySavings: 0, verifiedMonthlySavings: 0 }), { status: 200, headers: { 'content-type': 'application/json' } }) }) as typeof fetch
  await liveFetch('/api/outcomes/ledger/summary')
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/outcomes/ledger/summary')
})

test('live API failure renders error state and no demo fallback', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response('nope', { status: 503 })) as typeof fetch
  await assert.rejects(() => liveFetch('/api/recommendations'), /Live data unavailable/)
  globalThis.fetch = previousFetch
  const html = renderToStaticMarkup(<LiveDataError error={new Error('Live data unavailable (503)')} onRetry={() => undefined} />)
  assert.match(html, /Live data unavailable/)
  assert.doesNotMatch(html, /Snowflake auto-suspend verified/)
})

test('live empty payload renders EmptyState', () => {
  const html = renderToStaticMarkup(<EmptyState title='No recommendations yet' description='Live recommendations will appear when connectors and policies are ready.' />)
  assert.match(html, /No recommendations yet/)
})

test('live recommendations normalize into action rows', () => {
  const rows = normalizeRecommendations({ recommendations: [{ id: 'r1', title: 'M365 reclaim', domain: 'saas', projectedMonthlySavings: 1200, readiness: 'APPROVAL_REQUIRED', blastRadius: 'Medium' }] })
  assert.equal(rows[0].id, 'r1')
  assert.equal(rows[0].action, 'M365 reclaim')
  assert.equal(rows[0].saving, 1200)
  assert.equal(rows[0].verdict, 'approval-required')
})

test('live runtime connectors normalize into health/connector rows', () => {
  const data = normalizeConnectorOps({ connectors: [{ id: 'm365', name: 'M365', health: 'DEGRADED', trustScore: 72, lastError: 'stale evidence' }] })
  assert.equal(data.summary.configured, 1)
  assert.equal(data.summary.degraded, 1)
  assert.equal(data.connectors[0].status, 'degraded')
})

test('Command live aggregation handles partial data', () => {
  const data = normalizeCommandAggregate([{ recommendations: [{ id: 'r1', title: 'Rightsize', projectedMonthlySavings: 300, readiness: 'ELIGIBLE' }] }, { projectedMonthlySavings: 300, verifiedMonthlySavings: 0 }, { summary: 'Runtime partially available', overallScore: 86 }, { connectors: [] }, { events: [] }])
  assert.equal(data.actions.length, 1)
  assert.equal(data.metrics.totalIdentified, 300)
  assert.ok(data.posture.length > 0)
})

test('useRuntimeEvents remains read-only and polling-disabled in demo mode', () => {
  const hook = fs.readFileSync(new URL('../hooks/useRuntimeEvents.ts', import.meta.url), 'utf8')
  const liveEvents = fs.readFileSync(new URL('./liveRuntimeEvents.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('POST'), false)
  assert.equal(liveEvents.includes("workspace.mode === 'demo' || !workspace.dataReady"), true)
})

test('Command live empty activity uses runtime event list empty state', () => {
  const html = renderToStaticMarkup(<RuntimeActivityList events={[]} emptyLabel='No runtime activity yet' />)
  assert.match(html, /No runtime activity yet/)
})
