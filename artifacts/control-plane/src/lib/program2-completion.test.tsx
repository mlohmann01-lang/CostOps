import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { demoTechnologyPortfolioSummary, emptyTechnologyPortfolioSummary } from '../hooks/useTechnologyPortfolio'
import { demoOwnershipIntelligenceData, emptyOwnershipData } from '../hooks/useOwnershipIntelligenceData'
import { demoRenewalContractData, normalizeRenewalContractPayload } from '../hooks/useRenewalContractData'
import { demoVendorIntelligence } from '../data/demo'
import { demoUtilizationIntelligence } from '../data/demo'
import { program2Capabilities, program2CanonicalDecisions, program2ExecutiveQuestion, renderProgram2WorkspaceState } from './program2Completion'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Program 2 workspace has one executive question and complete capability map', () => {
  assert.equal(program2ExecutiveQuestion.includes('Which technology investments require management attention'), true)
  assert.deepEqual(program2Capabilities.map((capability) => capability.status), ['COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE', 'COMPLETE'])
  for (const decision of ['KEEP', 'RENEW', 'OPTIMISE', 'CONSOLIDATE', 'RETIRE', 'REVIEW', 'BLOCKED']) assert.ok(program2CanonicalDecisions.includes(decision as any))
})

test('Program 2 DEMO tells a connected workspace story', () => {
  const portfolio = demoTechnologyPortfolioSummary()
  const ownership = demoOwnershipIntelligenceData()
  const state = renderProgram2WorkspaceState({ portfolioAssets: portfolio.assets.length, ownershipFindings: ownership.findings.length, renewals: demoRenewalContractData.findings.length, vendors: demoVendorIntelligence.changes.length, utilisationRecords: demoUtilizationIntelligence.records.length, isDemo: true })
  assert.equal(state.hasDemoData, true)
  assert.equal(state.capabilities.includes('Technology Portfolio'), true)
  assert.equal(state.capabilities.includes('Ownership & Accountability'), true)
  assert.equal(state.capabilities.includes('Renewals'), true)
})

test('Program 2 LIVE_UNCONNECTED has no synthetic workspace data', () => {
  const renewals = normalizeRenewalContractPayload({})
  const state = renderProgram2WorkspaceState({ portfolioAssets: emptyTechnologyPortfolioSummary.assets.length, ownershipFindings: emptyOwnershipData.findings.length, renewals: renewals.findings.length, vendors: 0, utilisationRecords: 0, isDemo: false })
  assert.equal(state.emptyLive, true)
  assert.equal(renewals.summary.upcomingRenewals, 0)
  assert.equal(renewals.summary.potentialAnnualSavings, 0)
})

test('Program 2 navigation routes point to concrete workspace pages', () => {
  const app = read('../App.tsx')
  for (const route of ['/technology-portfolio', '/ownership', '/vendor-intelligence', '/utilization-intelligence', '/renewals', '/evidence']) assert.equal(app.includes(route), true)
  assert.equal(app.includes('<Route path="/vendor-intelligence" component={VendorIntelligenceRoute} />'), true)
  assert.equal(app.includes('<Route path="/utilization-intelligence" component={UtilizationIntelligenceRoute} />'), true)
  assert.equal(app.includes('<Route path="/renewals" component={RenewalsRoute} />'), true)
})

test('Program 2 pages use consistent executive workspace language and live boundary copy', () => {
  const sources = ['../pages/TechnologyPortfolio.tsx', '../pages/VendorIntelligenceView.tsx', '../pages/UtilizationIntelligenceView.tsx', '../pages/RenewalContractIntelligence.tsx', '../pages/OwnershipIntelligence.tsx'].map(read).join('\n')
  for (const phrase of ['Technology Management', 'Evidence Pack', 'Proof Pack', 'Management Decision', 'Renewal Risk', 'Duplicate Capability', 'Rationalisation Opportunity']) assert.equal(sources.includes(phrase), true)
  assert.equal(sources.includes('No demo assets, owners, renewals, vendors, utilisation, decisions, savings or confidence'), true)
})
