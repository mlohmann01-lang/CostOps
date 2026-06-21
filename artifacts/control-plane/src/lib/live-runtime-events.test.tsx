import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RuntimeActivityList } from '../components/shared/RuntimeActivityList'
import { demoActivityToRuntimeEvent } from '../hooks/useRuntimeEvents'
import { fetchRuntimeEvents, subscribeRuntimeEvents } from './liveRuntimeEvents'
import { normalizeRuntimeEvent } from './runtimeEventNormalizer'
import { getDemoRuntimeState, resetDemoRuntimeStore } from './demoRuntimeStore'
import type { WorkspaceContext } from '../types/workspace'

const demoWorkspace: WorkspaceContext = { mode: 'demo', tenantId: 'demo-sandbox-tenant', tenantName: 'Demo workspace', dataReady: true }
const liveEmptyWorkspace: WorkspaceContext = { mode: 'live', tenantId: 'tenant-live', tenantName: 'Live workspace', dataReady: false }
const liveReadyWorkspace: WorkspaceContext = { mode: 'live', tenantId: 'tenant-live', tenantName: 'Live workspace', dataReady: true }
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('runtime event normalizer handles governance event shapes', () => {
  const event = normalizeRuntimeEvent({ id: 'g1', at: '3m ago', action: 'AWS rightsize batch — pending', verdict: 'Approval required', actor: 'j.doe@acme.com', certId: 'GEC-1' }, { tenantId: 'tenant-a' })
  assert.equal(event.tenantId, 'tenant-a')
  assert.equal(event.eventId, 'g1')
  assert.equal(event.category, 'APPROVAL')
  assert.equal(event.type, 'APPROVAL_SUBMITTED')
  assert.equal(event.entityId, 'GEC-1')
  assert.equal(event.actorId, 'j.doe@acme.com')
})

test('demo mode returns demo runtime activity as runtime events', () => {
  resetDemoRuntimeStore()
  const event = demoActivityToRuntimeEvent(getDemoRuntimeState().activity[0], demoWorkspace.tenantId)
  assert.equal(event.tenantId, demoWorkspace.tenantId)
  assert.equal(event.message, 'Snowflake auto-suspend verified')
  assert.equal(event.category, 'EXECUTION')
})

test('live mode dataReady=false does not poll', async () => {
  let calls = 0
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => { calls += 1; return new Response('[]') }) as typeof fetch
  const unsubscribe = subscribeRuntimeEvents({ workspace: liveEmptyWorkspace, onEvents: () => undefined, intervalMs: 5 })
  await wait(20)
  unsubscribe()
  globalThis.fetch = previousFetch
  assert.equal(calls, 0)
})

test('live mode calls /api/events/recent when dataReady=true', async () => {
  let url = ''
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => { url = String(input); return new Response(JSON.stringify({ events: [{ eventId: 'e1', tenantId: 'tenant-live', category: 'SYSTEM', type: 'SYSTEM_HEALTH_CHANGED', entityType: 'system', entityId: 'runtime', message: 'Runtime healthy', severity: 'success', createdAt: '2026-05-29T00:00:00Z' }] }), { status: 200 }) }) as typeof fetch
  const events = await fetchRuntimeEvents({ tenantId: liveReadyWorkspace.tenantId })
  globalThis.fetch = previousFetch
  assert.equal(url, '/api/events/recent?tenantId=tenant-live')
  assert.equal(events.length, 1)
  assert.equal(events[0].message, 'Runtime healthy')
})

test('failed live fetch surfaces error and does not use demo fallback', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response('missing', { status: 404 })) as typeof fetch
  await assert.rejects(() => fetchRuntimeEvents({ tenantId: 'tenant-live' }), /Runtime events unavailable/)
  globalThis.fetch = previousFetch
  assert.equal(getDemoRuntimeState().activity.some((event) => event.message === 'Snowflake auto-suspend verified'), true)
})

test('Command activity renders demo events through RuntimeActivityList foundation', () => {
  resetDemoRuntimeStore()
  const events = getDemoRuntimeState().activity.map((event) => demoActivityToRuntimeEvent(event, demoWorkspace.tenantId))
  const html = renderToStaticMarkup(<RuntimeActivityList events={events} limit={5} emptyLabel='No runtime activity yet' compact />)
  assert.match(html, /Snowflake auto-suspend verified/)
})

test('Command live empty state renders when no events', () => {
  const html = renderToStaticMarkup(<RuntimeActivityList events={[]} limit={5} emptyLabel='No runtime activity yet' compact />)
  // Program 6 (Executive Command Center) removed CommandView's "What Changed" runtime
  // activity section in favor of the six orchestrator sections. The RuntimeActivityList
  // foundation component itself (asserted above) is unaffected and used elsewhere.
  assert.match(html, /No runtime activity yet/)
})

test('no polling in demo mode', async () => {
  let calls = 0
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => { calls += 1; return new Response('[]') }) as typeof fetch
  const unsubscribe = subscribeRuntimeEvents({ workspace: demoWorkspace, onEvents: () => undefined, intervalMs: 5 })
  await wait(20)
  unsubscribe()
  globalThis.fetch = previousFetch
  assert.equal(calls, 0)
})
