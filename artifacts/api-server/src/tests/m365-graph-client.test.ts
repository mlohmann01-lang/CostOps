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

test('Graph client retries 429 and gates license removal mutation', async () => {
  let calls = 0
  const client = new M365GraphClient({ tenantId: 't', accessToken: 'token', retryBaseMs: 0, fetchImpl: (async () => { calls += 1; return calls === 1 ? new Response('', { status: 429, headers: { 'retry-after': '0' } }) : jsonResponse({ value: [] }) }) as any })
  await client.getSubscribedSkus()
  assert.equal(calls, 2)
  assert.equal('assignLicense' in client, false)
  assert.equal('removeLicense' in client, true)
  await assert.rejects(() => client.removeLicense({ userId: 'u', skuId: 'sku', calledBy: 'M365LicenseExecutionService' }), /MUTATION_DISABLED/)
})

test('Graph client removeLicense posts assignLicense only when mutation flag is enabled', async () => {
  const calls: any[] = []
  process.env.M365_ENABLE_LIVE_LICENSE_MUTATION = 'true'
  const client = new M365GraphClient({ tenantId: 't', accessToken: 'token', fetchImpl: (async (url: string, init: RequestInit) => { calls.push({ url, init }); return jsonResponse({ ok: true }, { headers: { 'request-id': 'rid' } }) }) as any })
  const out = await client.removeLicense({ userId: 'u', skuId: 'sku', calledBy: 'M365LicenseExecutionService' })
  assert.equal(out.status, 'REMOVED')
  assert.equal(calls[0].url.includes('/users/u/assignLicense'), true)
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { addLicenses: [], removeLicenses: ['sku'] })
  delete process.env.M365_ENABLE_LIVE_LICENSE_MUTATION
})
