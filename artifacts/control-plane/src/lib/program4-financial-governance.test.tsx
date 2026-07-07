import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { demoFinancialGovernanceData, emptyFinancialGovernanceData } from '../hooks/useExecutiveValueData'
import { buildFinanceEvidencePack, renderFinancialGovernanceState } from '../pages/ExecutiveValueDashboard'
import { getFinanceEvidencePackCompleteness, inferFinancialDecision, program4FinancialGovernanceRoute } from './program4FinancialGovernance'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Financial Governance DEMO renders coherent finance scenarios', () => {
  const data = demoFinancialGovernanceData()
  const rendered = renderFinancialGovernanceState(data, true)
  assert.equal(rendered.title, 'Financial Governance')
  assert.equal(rendered.question, program4FinancialGovernanceRoute.question)
  assert.ok(rendered.scenarioCount >= 6)
  assert.ok(rendered.decisions.includes('KEEP'))
  assert.ok(rendered.decisions.includes('CONSOLIDATE'))
  assert.ok(rendered.decisions.includes('OPTIMISE'))
  assert.ok(rendered.decisions.includes('RETIRE'))
  assert.ok(rendered.decisions.includes('BLOCKED'))
  assert.ok(rendered.decisions.includes('EXPAND'))
})

test('Financial Governance LIVE_UNCONNECTED contains no demo finance', () => {
  const rendered = renderFinancialGovernanceState(emptyFinancialGovernanceData, false)
  assert.equal(rendered.demoBanner, '')
  assert.equal(rendered.empty, true)
  assert.equal(rendered.technologyInvestment, undefined)
  assert.equal(rendered.financeConfirmedValue, undefined)
  assert.equal(rendered.protectedValue, undefined)
  assert.equal(rendered.valueLeakage, undefined)
  assert.equal(rendered.scenarioCount, 0)
  assert.deepEqual(rendered.decisions, [])
})

test('Finance Evidence Pack COMPLETE vs PARTIAL works', () => {
  const complete = getFinanceEvidencePackCompleteness({ investmentIdentifier:'inv', assetOrInitiative:'M365', businessObjective:'Recover licences', investmentOwner:'CIO', spendBasis:100, budgetBasis:120, costCentre:'IT', financialPeriod:'FY26', expectedOutcome:'Recover spend', measuredOutcome:'Recovered spend', protectedOutcome:'Policy', valueRealised:50, leakage:0, executiveDecision:'KEEP', financeConfirmationStatus:'CONFIRMED', verification:'VERIFIED', confidence:'HIGH', sourceSystems:['ERP'], lineage:'erp/lineage', timestamp:'2026-07-06T00:00:00Z', outcomeLinkage:'outcome:m365', leakageApplicable:true })
  assert.equal(complete.status, 'COMPLETE')
  const partial = getFinanceEvidencePackCompleteness({ investmentIdentifier:'inv', assetOrInitiative:'Cloud', executiveDecision:'REVIEW', verification:'ESTIMATED', confidence:'LOW', sourceSystems:['Cloud'], leakageApplicable:true })
  assert.equal(partial.status, 'PARTIAL')
  assert.ok(partial.missing.includes('businessObjective'))
  assert.ok(partial.missing.includes('spendBasis'))
  assert.ok(partial.missing.includes('leakage'))
})

test('Financial decision rules are deterministic', () => {
  assert.equal(inferFinancialDecision({ hasFinancialEvidence:false }).decision, 'BLOCKED')
  assert.equal(inferFinancialDecision({ hasFinancialEvidence:true, valueBasis:'ESTIMATED', financeConfirmed:false }).decision, 'REVIEW')
  assert.equal(inferFinancialDecision({ hasFinancialEvidence:true, valueBasis:'VERIFIED', financeConfirmed:true }).decision, 'KEEP')
  assert.equal(inferFinancialDecision({ hasFinancialEvidence:true, valueBasis:'VERIFIED', financeConfirmed:true, roi:-0.1 }).decision, 'RETIRE')
  assert.equal(inferFinancialDecision({ hasFinancialEvidence:true, valueBasis:'VERIFIED', financeConfirmed:true, duplicateSpend:true }).decision, 'CONSOLIDATE')
  assert.equal(inferFinancialDecision({ hasFinancialEvidence:true, valueBasis:'VERIFIED', financeConfirmed:true, growthOpportunity:true }).decision, 'EXPAND')
  assert.equal(inferFinancialDecision({ hasFinancialEvidence:true, valueBasis:'VERIFIED', financeConfirmed:true, underPerforming:true }).decision, 'OPTIMISE')
})

test('Financial Governance KPI values remain mode-safe', () => {
  const live = renderFinancialGovernanceState(emptyFinancialGovernanceData, false)
  assert.equal(live.technologyInvestment, undefined)
  assert.equal(live.investmentConfidence, undefined)
  const demo = renderFinancialGovernanceState(demoFinancialGovernanceData(), true)
  assert.ok(Number(demo.technologyInvestment) > 0)
  assert.ok(Number(demo.valueLeakage) > 0)
})

test('Executive heading question and no live demo leakage language are present', () => {
  const page = read('../pages/ExecutiveValueDashboard.tsx')
  const hook = read('../hooks/useExecutiveValueData.ts')
  assert.ok(page.includes('Financial Governance'))
  assert.ok(page.includes(program4FinancialGovernanceRoute.question))
  assert.ok(page.includes('No demo spend, savings, value, ROI, investment, confidence, finance decisions, or protected value'))
  assert.ok(hook.includes('!workspace.dataReady'))
  assert.doesNotMatch(hook, /catch[\s\S]{0,220}demoFinancialGovernanceData/)
})

test('Demo finance evidence packs honestly mark complete and partial evidence', () => {
  const statuses = demoFinancialGovernanceData().scenarios.map((scenario) => buildFinanceEvidencePack(scenario).status)
  assert.ok(statuses.includes('COMPLETE'))
  assert.ok(statuses.includes('PARTIAL'))
})
