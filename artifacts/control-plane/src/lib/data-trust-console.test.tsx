import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { demoConnectorTrust, demoExecutionReadiness, demoTrustFindings, demoTrustSummary } from '../data/demo'
import { trustApiPaths } from '../hooks/useDataTrustData'
import DataTrustView from '../pages/DataTrustView'
import { EmptyState, LiveDataError } from '../components/shared/Foundation'

test('Data Trust route renders', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/data-trust'), true)
  assert.equal(typeof DataTrustView, 'function')
})

test('summary cards render score + band', () => {
  assert.equal(demoTrustSummary.globalTrustScore, 83)
  assert.equal(demoTrustSummary.globalTrustBand, 'HIGH')
  assert.ok(demoTrustSummary.globalTrustReasons[0].length > 0)
})

test('visual indicator renders with score', () => {
  const source = fs.readFileSync(new URL('../pages/DataTrustView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('trust visual indicator'), true)
  assert.equal(source.includes('globalTrustBand'), true)
  assert.equal(source.includes('globalTrustReasons'), true)
})

test('connector trust grid renders M365/AWS/Snowflake/ServiceNow in demo mode', () => {
  const names = demoConnectorTrust.map((c) => c.connectorName).join('|')
  assert.match(names, /M365/)
  assert.match(names, /AWS/)
  assert.match(names, /Snowflake/)
  assert.match(names, /ServiceNow/)
})

test('findings table renders affected value and remediation hint', () => {
  assert.ok(demoTrustFindings.some((f) => f.affectedValue === 12400 && f.remediationHint.includes('Resolve')))
  const source = fs.readFileSync(new URL('../pages/DataTrustView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Affected Value'), true)
  assert.equal(source.includes('Remediation Hint'), true)
})

test('live mode calls /api/trust/*', () => {
  assert.deepEqual(trustApiPaths, ['/api/trust/summary', '/api/trust/connectors', '/api/trust/findings', '/api/trust/readiness'])
})

test('live error renders without demo fallback', () => {
  const html = renderToStaticMarkup(<LiveDataError error={new Error('Live trust data unavailable')} onRetry={() => undefined} />)
  assert.match(html, /Live data unavailable/)
  assert.doesNotMatch(html, /ServiceNow requires review/)
})

test('live empty state renders when dataReady=false', () => {
  const html = renderToStaticMarkup(<EmptyState title='Data trust not available yet' description='Connect and sync your first data source to calculate trust, readiness, and blocked value.' />)
  assert.match(html, /Data trust not available yet/)
})

test('Data Trust is a footer chip and platform alias, not primary nav', () => {
  const source = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('Data trust: 83 HIGH'), true)
  assert.equal(source.includes("label: 'Data Trust'"), false)
  assert.equal(source.includes("href: '/platform'"), true)
})

test('execution readiness demo values are realistic', () => {
  assert.equal(demoExecutionReadiness.executionEligibleValue, 42000)
  assert.equal(demoExecutionReadiness.approvalRequiredValue, 18000)
  assert.equal(demoExecutionReadiness.blockedByTrustValue, 9000)
  assert.equal(demoExecutionReadiness.blockedByPolicyValue, 4000)
  assert.equal(demoExecutionReadiness.manualOnlyValue, 2000)
})
