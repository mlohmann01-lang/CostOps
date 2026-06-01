import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('platform event routes expose canonical read-only API', async () => {
  const routes = await readFile('src/routes/events.ts', 'utf8')
  for (const route of ["/events/recent", "/events/category/:category", "/events/entity/:entityType/:entityId", "/events/:eventId", "/events"]) assert.equal(routes.includes(route), true)
  assert.equal(routes.includes('router.post'), false)
  assert.equal(routes.includes('router.put'), false)
  assert.equal(routes.includes('router.delete'), false)
})

test('runtime health includes Platform Event Authority', async () => {
  const runtime = await readFile('src/routes/runtime-observability.ts', 'utf8')
  assert.equal(runtime.includes('Platform Event Authority'), true)
  assert.equal(runtime.includes('platformEventService.listEvents'), true)
})
