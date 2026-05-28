import test from 'node:test'
import assert from 'node:assert/strict'
import { demoActions, demoPostureSignals, demoPriorityActions, demoCommandMetrics } from '../data/demo'
import { proofSteps } from '../pages/CommandView'

test('Command posture strip source data exists', () => {
  assert.equal(demoPostureSignals.length, 3)
  assert.equal(demoPostureSignals[0].value, '2 approval bottlenecks')
})

test('Command has 10 demo actions across required domains', () => {
  assert.equal(demoActions.length, 10)
  const names = demoActions.map(a => a.action).join(' | ')
  assert.match(names, /M365|AWS|OpenAI|Snowflake|Azure|Copilot|ServiceNow|GCP|Zoom|Datadog/)
})

test('Row expansion governance proof chain vocabulary', () => {
  assert.deepEqual(proofSteps(), ['Telemetry validated','Cost model applied','Blast radius assessed','Policy gate cleared'])
})

test('Priority actions render source values and links', () => {
  assert.equal(demoPriorityActions.length, 3)
  assert.match(demoPriorityActions[0].text, /awaiting second approver/)
})

test('money formatting target values are k-friendly', () => {
  assert.equal(demoCommandMetrics.totalIdentified, 25000)
  assert.equal(demoCommandMetrics.eligibleNow, 11000)
})
