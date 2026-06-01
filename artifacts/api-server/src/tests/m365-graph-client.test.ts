import test from 'node:test'
import assert from 'node:assert/strict'
import { M365GraphClient } from '../lib/connectors/m365/m365-graph-client'

function jsonResponse(body: unknown, init: ResponseInit = {}) { return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }, ...init }) }

test('Graph client handles pagination', async () => {
  const calls: string[] = []
  const client = new M365GraphClient({ tenantId: 't', accessToken: 'token', retryBaseMs: 0, fetchImpl: (async (url: string) => { calls.push(url); return jsonResponse(url.includes('page2') ? { value: [{ id: 2 }] } : { value: [{ id: 1 }], '@odata.nextLink': 'https://graph.test/page2' }) }) as any })
  const rows = await client.getPaged('/users')
  assert.deepEqual(rows.map((r: any) => r.id), [1, 2])
  assert.equal(calls.length, 2)
})

test('Graph client retries 429 and exposes read methods only', async () => {
  let calls = 0
  const client = new M365GraphClient({ tenantId: 't', accessToken: 'token', retryBaseMs: 0, fetchImpl: (async () => { calls += 1; return calls === 1 ? new Response('', { status: 429, headers: { 'retry-after': '0' } }) : jsonResponse({ value: [] }) }) as any })
  await client.getSubscribedSkus()
  assert.equal(calls, 2)
  assert.equal('assignLicense' in client, false)
})
