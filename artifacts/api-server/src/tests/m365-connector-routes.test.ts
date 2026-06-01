import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('M365 production connector routes expose read-only readiness discovery health trust and snapshot APIs', async () => {
  const routes = await readFile('src/routes/connectors.ts', 'utf8')
  for (const route of ['/m365/readiness', '/m365/readiness/check', '/m365/discover', '/m365/discovery-runs', '/m365/snapshots/latest', '/m365/health', '/m365/trust', '/m365/users', '/m365/licenses', '/m365/usage', '/m365/mailboxes']) assert.equal(routes.includes(route), true)
  assert.equal(routes.includes('assignLicense'), false)
})
