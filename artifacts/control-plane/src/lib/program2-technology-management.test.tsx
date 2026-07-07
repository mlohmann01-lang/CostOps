import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildTechnologyManagementEvidencePack, demoTechnologyPortfolioSummary, emptyTechnologyPortfolioSummary, summarizeTechnologyManagementKpis } from '../hooks/useTechnologyPortfolio'
import { renderTechnologyPortfolioState } from '../pages/TechnologyPortfolio'
import { getProgram2EvidencePackCompleteness, inferTechnologyManagementDecision, program2TechnologyManagementRoute } from './program2TechnologyManagement'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Technology Management DEMO renders coherent Program 2 portfolio data', () => {
  const summary = demoTechnologyPortfolioSummary()
  const rendered = renderTechnologyPortfolioState(summary, true)
  assert.equal(rendered.title, 'Technology Management')
  assert.equal(rendered.question, program2TechnologyManagementRoute.question)
  assert.ok(rendered.governedAssets >= 6)
  assert.ok(rendered.missingOwner >= 2)
  assert.ok(rendered.renewalsInside90Days >= 3)
  assert.ok(rendered.duplicateCapabilities >= 1)
  assert.ok(rendered.decisions.includes('RENEW'))
  assert.ok(rendered.decisions.includes('OPTIMISE'))
  assert.ok(rendered.decisions.includes('CONSOLIDATE'))
  assert.ok(rendered.decisions.includes('BLOCKED'))
})

test('Technology Management LIVE_UNCONNECTED renders no demo portfolio data or recommendations', () => {
  const rendered = renderTechnologyPortfolioState(emptyTechnologyPortfolioSummary, false)
  assert.equal(rendered.demoBanner, '')
  assert.equal(rendered.empty, true)
  assert.equal(rendered.governedAssets, 0)
  assert.equal(rendered.missingOwner, 0)
  assert.equal(rendered.renewalsInside90Days, 0)
  assert.equal(rendered.duplicateCapabilities, 0)
  assert.equal(rendered.rationalisationOpportunity, '$0')
  assert.equal(rendered.assetRows, 0)
  assert.equal(rendered.recommendationCount, 0)
})

test('Program 2 Evidence Pack COMPLETE vs PARTIAL logic includes conditional fields', () => {
  const complete = getProgram2EvidencePackCompleteness({ assetSourceSystem: 'M365', ownerOrOwnerStatus: 'ASSIGNED', businessUnitOrCostCentre: 'IT-100', contractOrRenewalBasis: '2026-08-18', spendOrValueBasis: 850000, usageOrUtilisationBasis: 72, riskOrOverlapReason: 'Renewal risk', recommendedManagementDecision: 'RENEW', verificationStatus: 'COMPLETE', confidence: 'HIGH', timestampOrLineage: '2026-07-05T00:00:00Z', outcomeOrProtectionState: 'ACTIVE', renewalApplicable: true, usageApplicable: true, riskOrOverlapApplicable: true, outcomeApplicable: true })
  assert.equal(complete.status, 'COMPLETE')
  assert.deepEqual(complete.missing, [])
  const partial = getProgram2EvidencePackCompleteness({ assetSourceSystem: 'Legacy CRM', ownerOrOwnerStatus: 'MISSING', recommendedManagementDecision: 'REVIEW', verificationStatus: 'PARTIAL', confidence: 'LOW', renewalApplicable: true, usageApplicable: true, riskOrOverlapApplicable: true })
  assert.equal(partial.status, 'PARTIAL')
  assert.ok(partial.missing.includes('businessUnitOrCostCentre'))
  assert.ok(partial.missing.includes('contractOrRenewalBasis'))
  assert.ok(partial.missing.includes('usageOrUtilisationBasis'))
})

test('Missing owner, missing renewal, or missing evidence produces REVIEW or BLOCKED', () => {
  assert.equal(inferTechnologyManagementDecision({ ownerStatus: 'MISSING', evidenceCompletenessStatus: 'PARTIAL' }, true), 'BLOCKED')
  assert.equal(inferTechnologyManagementDecision({ ownerStatus: 'MISSING', evidenceCompletenessStatus: 'PARTIAL' }, false), 'REVIEW')
  const summary = demoTechnologyPortfolioSummary()
  const shadow = summary.assets.find((asset) => asset.id === 'asset-shadow-ai')!
  const pack = buildTechnologyManagementEvidencePack(shadow, summary)
  assert.equal(pack.status, 'PARTIAL')
})

test('Technology Management KPI values are mode-safe', () => {
  const live = summarizeTechnologyManagementKpis(emptyTechnologyPortfolioSummary)
  assert.deepEqual(live, { totalGovernedAssets: 0, assetsMissingOwner: 0, renewalsInside90Days: 0, duplicateCapabilitiesDetected: 0, annualisedSpendUnderReview: 0, rationalisationOpportunity: 0, highRiskUnmanagedAssets: 0, evidenceCompletenessRate: undefined })
  const demo = summarizeTechnologyManagementKpis(demoTechnologyPortfolioSummary())
  assert.ok(demo.totalGovernedAssets > 0)
  assert.ok(demo.rationalisationOpportunity > 0)
})

test('Technology Management executive heading/question and safe live language are visible', () => {
  const page = read('../pages/TechnologyPortfolio.tsx')
  const hook = read('../hooks/useTechnologyPortfolio.ts')
  assert.ok(page.includes('Technology Management'))
  assert.ok(page.includes(program2TechnologyManagementRoute.question))
  assert.ok(page.includes('No demo assets, synthetic owners, renewals, savings, overlaps, recommendations, or management decisions'))
  assert.ok(hook.includes('!workspace.dataReady'))
  assert.doesNotMatch(hook, /catch[\s\S]{0,220}demoTechnologyPortfolioSummary/)
})
