import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { demoPlatformEvidence, emptyPlatformEvidence, getPlatformEvidencePackCompleteness, inferPlatformDecision, platformCapabilities, platformDecisions, program5PlatformQuestion, summarizePlatformKpis } from './program5Platform'
import { renderPlatformWorkspaceState } from '../pages/PlatformOperationsWorkspace'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Program 5 Platform workspace has one executive question and coherent capabilities', () => {
  assert.equal(program5PlatformQuestion.includes('configured, connected, healthy'), true)
  for (const label of ['Admin', 'Runtime', 'Connectors', 'Health', 'Tenants', 'Settings', 'Readiness', 'Platform Evidence Pack / Proof Pack']) assert.equal(platformCapabilities.some((capability) => capability.label === label), true)
  for (const decision of ['READY', 'CONFIGURE', 'CONNECT', 'VERIFY', 'DEGRADED', 'BLOCKED']) assert.ok(platformDecisions.includes(decision as any))
})

test('Program 5 DEMO tells a connected platform operations story', () => {
  const text = JSON.stringify(demoPlatformEvidence)
  for (const snippet of ['demo-sandbox-tenant', 'DEMO / PILOT_CONTROLLED_EXECUTION', 'Microsoft 365', 'AWS', 'Azure', 'ServiceNow', 'Snowflake', 'Admin, Operator, Approver, Auditor and Viewer roles present']) assert.equal(text.includes(snippet), true)
  const rendered = renderPlatformWorkspaceState(demoPlatformEvidence, true)
  assert.equal(rendered.hasDemoStory, true)
  assert.equal(rendered.kpis.connectedSources, 5)
})

test('Platform Evidence Pack COMPLETE vs PARTIAL and decisions are deterministic', () => {
  assert.equal(getPlatformEvidencePackCompleteness(demoPlatformEvidence).status, 'COMPLETE')
  assert.equal(getPlatformEvidencePackCompleteness({ tenantIdentifier: 'tenant' }).status, 'PARTIAL')
  assert.equal(inferPlatformDecision({ ...demoPlatformEvidence, readinessStatus: 'READY', healthCheckResult: 'PASS', connectorHealth: { M365: 'HEALTHY' }, connectorInventory: ['M365'], healthIssueDetected: false, unverifiedConnector: false }).decision, 'READY')
  assert.equal(inferPlatformDecision({ ...demoPlatformEvidence, missingRequiredSettings: true }).decision, 'CONFIGURE')
  assert.equal(inferPlatformDecision({ ...demoPlatformEvidence, connectorInventory: [], missingConnectors: true }).decision, 'CONNECT')
  assert.equal(inferPlatformDecision({ ...demoPlatformEvidence, unverifiedConnector: true }).decision, 'VERIFY')
  assert.equal(inferPlatformDecision({ ...demoPlatformEvidence, unverifiedConnector: false, connectorHealth: { M365: 'HEALTHY', Azure: 'DEGRADED' }, healthIssueDetected: true }).decision, 'DEGRADED')
  assert.equal(inferPlatformDecision({ criticalMissingOperationalEvidence: true }).decision, 'BLOCKED')
})

test('Program 5 LIVE_UNCONNECTED contains no demo platform data and KPIs are mode-safe', () => {
  const rendered = renderPlatformWorkspaceState(emptyPlatformEvidence, false)
  assert.equal(rendered.emptyLive, true)
  assert.equal(rendered.kpis.connectedSources, 0)
  assert.equal(rendered.kpis.healthyConnectors, 0)
  assert.equal(rendered.kpis.platformEvidenceCompleteness, undefined)
})

test('Platform navigation routes are concrete and page uses unified executive language', () => {
  const app = read('../App.tsx')
  const page = read('../pages/PlatformOperationsWorkspace.tsx')
  for (const route of ['/platform', '/platform/:section', '/runtime', '/runtime-health', '/connector-hub', '/settings']) assert.equal(app.includes(route), true)
  for (const phrase of ['Unified Platform Operations Workspace', 'Platform Evidence Pack and Proof Pack', 'Platform Decision Model', 'No demo live connector health, tenant readiness, live settings, live users, live roles, evidence sources, health status, live readiness or operational confidence']) assert.equal(page.includes(phrase), true)
})
