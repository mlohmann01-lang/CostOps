import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCommandAggregate, normalizeCampaigns, normalizeSchedule, normalizeRuntimeHealth, normalizeConnectorOps } from './liveNormalizers'

test('command metrics update from outcome projection summary', () => {
  const data = normalizeCommandAggregate([[], { totalVerifiedSavings: 80, pendingVerificationCount: 2, failedVerificationCount: 1, activeDrift: 1 }, { runtimeStatus:'OPERATIONAL' }, []])
  assert.equal(data.metrics.verifiedSavings, 80)
  assert.equal(data.metrics.pendingVerification, 2)
  assert.equal(data.metrics.activeDrift, 1)
})

test('campaign projection renders verified savings and status', () => {
  const campaigns = normalizeCampaigns([{ campaignId:'c1', name:'Outcome campaign', projectedSavings:100, verifiedSavings:80, outcomeStatus:'COMPLETED', driftStatus:'MONITORED' }])
  assert.equal(campaigns[0].verifiedSavings, 80)
  assert.equal(campaigns[0].outcomeStatus, 'COMPLETED')
})

test('schedule status rendering uses runtime status', () => {
  const data = normalizeSchedule([{ scheduleId:'s1', scheduleName:'Window', scheduleState:'READY', executionRequestIds:['exec-1'], projectedSavings:20 }])
  assert.equal(data.upcoming[0].readiness, 'READY')
})

test('runtime health updates include runtimes', () => {
  const data = normalizeRuntimeHealth([{ overallScore:90, components:[{ id:'verification-runtime', name:'Verification Runtime', status:'READY', wording:'Verified Savings: 80' }, { id:'drift-runtime', name:'Drift Runtime', status:'READY', wording:'Active Drift: 0' }] }, {}, [], {}, []])
  assert.ok(data.components.some((c:any)=>c.name==='Verification Runtime'))
  assert.ok(data.components.some((c:any)=>c.name==='Drift Runtime'))
})

test('connector readiness rendering maps readiness state', () => {
  const data = normalizeConnectorOps([{ id:'m365', name:'Microsoft 365', status:'READY', detail:'ready' }, { id:'m365-blocked', name:'M365 blocked', status:'BLOCKED' }])
  assert.equal(data.connectors[0].status, 'ready')
  assert.equal(data.connectors[1].status, 'blocked')
})

test('live empty states stay empty', () => {
  const data = normalizeCampaigns([])
  assert.equal(data.length, 0)
})

test('no demo fallback in runtime completion normalizers', () => {
  const command = normalizeCommandAggregate([[], {}, {}, []])
  assert.equal(command.actions.length, 0)
  assert.equal(JSON.stringify(command).includes('Snowflake auto-suspend verified'), false)
})
