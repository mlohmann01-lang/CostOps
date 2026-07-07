import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { demoDiscoveryOpportunities, discoveryDecisions, discoveryDomains, emptyDiscoveryOpportunities, getDiscoveryEvidencePackCompleteness, inferDiscoveryDecision, program3DiscoveryQuestion } from './program3Discovery'
import { renderDiscoveryWorkspaceState } from '../pages/DiscoveryWorkspace'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Program 3 Discovery workspace has one executive question and all domains', () => {
  assert.equal(program3DiscoveryQuestion.includes('Where are the verified opportunities'), true)
  for (const label of ['M365 Discovery', 'SaaS Discovery', 'AI Discovery', 'Cloud / AWS / Azure Discovery', 'Snowflake Discovery', 'Databricks Discovery', 'ServiceNow Discovery', 'Flexera / ITAM Discovery']) assert.equal(discoveryDomains.some((domain) => domain.label === label), true)
  for (const decision of ['EXECUTE', 'APPROVE', 'REVIEW', 'ASSIGN_OWNER', 'OPTIMISE', 'CONSOLIDATE', 'RETIRE', 'PROTECT', 'BLOCKED']) assert.ok(discoveryDecisions.includes(decision as any))
})

test('Program 3 DEMO tells a connected multi-domain opportunity story', () => {
  const text = JSON.stringify(demoDiscoveryOpportunities)
  for (const snippet of ['Microsoft 365 E5 inactive user cohort', 'Slack, Teams, Zoom and Miro overlap', 'Unapproved AI Notes App', 'Idle EC2 analytics worker', 'Oversized API VM scale set', 'Finance XL warehouse', 'ML development all-purpose cluster', 'Legacy API service CI', 'M365 E3/E5 entitlement mismatch']) assert.equal(text.includes(snippet), true)
  const rendered = renderDiscoveryWorkspaceState(demoDiscoveryOpportunities, true)
  assert.equal(rendered.kpis.opportunitiesDiscovered, 9)
  assert.equal(rendered.kpis.connectedSources, 9)
  assert.equal(rendered.emptyLive, false)
})

test('Discovery Evidence Pack COMPLETE vs PARTIAL and decisions are deterministic', () => {
  const complete = getDiscoveryEvidencePackCompleteness(demoDiscoveryOpportunities[0])
  assert.equal(complete.status, 'COMPLETE')
  const partial = getDiscoveryEvidencePackCompleteness({ sourceSystem: 'M365', opportunityType: 'unused licences' })
  assert.equal(partial.status, 'PARTIAL')
  assert.equal(inferDiscoveryDecision({ executionReadiness: 'EXECUTION_READY', verificationStatus: 'VERIFIED' }).decision, 'EXECUTE')
  assert.equal(inferDiscoveryDecision({ requiresApproval: true, verificationStatus: 'VERIFIED' }).decision, 'APPROVE')
  assert.equal(inferDiscoveryDecision({ ownerStatus: 'MISSING', verificationStatus: 'VERIFIED' }).decision, 'ASSIGN_OWNER')
  assert.equal(inferDiscoveryDecision({ verificationStatus: 'ESTIMATED' }).decision, 'REVIEW')
  assert.equal(inferDiscoveryDecision({ duplicateCapability: true, verificationStatus: 'VERIFIED' }).decision, 'CONSOLIDATE')
  assert.equal(inferDiscoveryDecision({ dormantOrUnused: true, verificationStatus: 'VERIFIED' }).decision, 'RETIRE')
  assert.equal(inferDiscoveryDecision({ protectedOutcomeRequired: true, verificationStatus: 'VERIFIED' }).decision, 'PROTECT')
  assert.equal(inferDiscoveryDecision({ missingCriticalEvidence: true }).decision, 'BLOCKED')
})

test('Program 3 LIVE_UNCONNECTED contains no demo discovery data and KPIs are mode-safe', () => {
  const rendered = renderDiscoveryWorkspaceState(emptyDiscoveryOpportunities, false)
  assert.equal(rendered.emptyLive, true)
  assert.equal(rendered.kpis.opportunitiesDiscovered, 0)
  assert.equal(rendered.kpis.estimatedOpportunity, 0)
  assert.equal(rendered.kpis.evidenceCompleteness, undefined)
})

test('Discovery navigation routes are concrete and page uses unified executive language', () => {
  const app = read('../App.tsx')
  const page = read('../pages/DiscoveryWorkspace.tsx')
  for (const route of ['/discovery', '/discovery/:domain']) assert.equal(app.includes(route), true)
  for (const phrase of ['Unified Discovery Workspace', 'Opportunity Detail, Evidence Pack and Proof Pack', 'Discovery Decision Model', 'No demo opportunities, applications, resources, AI tools, owners, spend, savings, risk values, decisions or execution readiness']) assert.equal(page.includes(phrase), true)
})
