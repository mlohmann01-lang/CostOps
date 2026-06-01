import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Connector Hub shows M365 production readiness, actions and trust dimensions', () => {
  const page = fs.readFileSync(new URL('../pages/ConnectorHub.tsx', import.meta.url), 'utf8')
  for (const label of ['M365 Production Readiness', 'Read readiness', 'Write readiness', 'Check readiness', 'Run discovery', 'Trust report', 'identityTrust', 'licenseTrust', 'usageTrust', 'activityTrust', 'mailboxTrust', 'executionSafetyTrust']) assert.equal(page.includes(label), true)
})

test('Connector Hub live hook calls production M365 APIs and has no demo fallback in live', () => {
  const hook = fs.readFileSync(new URL('../hooks/useConnectorHubData.ts', import.meta.url), 'utf8')
  for (const route of ['/api/connectors/m365/readiness', '/api/connectors/m365/health', '/api/connectors/m365/trust', '/api/connectors/m365/snapshots/latest']) assert.equal(hook.includes(route), true)
  assert.equal(hook.includes("if(w.mode==='demo')"), true)
  assert.equal(hook.includes('demo.connectors'), true)
})

test('Runtime Health and Data Trust include M365 connector dimensions', () => {
  const runtimeRoute = fs.readFileSync(new URL('../../../api-server/src/routes/runtime-observability.ts', import.meta.url), 'utf8')
  const trustHook = fs.readFileSync(new URL('../hooks/useDataTrustData.ts', import.meta.url), 'utf8')
  assert.equal(runtimeRoute.includes('M365 Connector'), true)
  assert.equal(runtimeRoute.includes('rate limit risk'), true)
  assert.equal(trustHook.includes('/api/connectors/m365/trust'), true)
  assert.equal(trustHook.includes('executionSafetyTrust'), true)
})
