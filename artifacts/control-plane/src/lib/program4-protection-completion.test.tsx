import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { demoProtectionOutcomes, emptyProtectionOutcomes, getProtectionEvidencePackCompleteness, inferProtectionDecision, program4ProtectionQuestion, protectionCapabilities, protectionDecisions, summarizeProtectionKpis } from './program4Protection'
import { emptyOutcomeProtectionData, normalizeOutcomes, summarizeOutcomeProtection } from '../hooks/useOutcomeProtectionData'
import { renderProtectionWorkspaceState } from '../pages/ProtectionWorkspace'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Program 4 Protection workspace has one executive question and coherent capabilities', () => {
  assert.equal(program4ProtectionQuestion.includes('Which executed outcomes are verified'), true)
  for (const label of ['Verification', 'Drift', 'Rollback', 'Outcome Protection', 'Trust', 'Protection Evidence Pack / Proof Pack']) assert.equal(protectionCapabilities.some((capability) => capability.label === label), true)
  for (const decision of ['VERIFIED', 'PROTECTED', 'DRIFTING', 'ROLLBACK_READY', 'ROLLBACK_REQUIRED', 'REVIEW', 'BLOCKED']) assert.ok(protectionDecisions.includes(decision as any))
})

test('Program 4 DEMO tells a connected post-execution protection story', () => {
  const text = JSON.stringify(demoProtectionOutcomes)
  for (const snippet of ['M365 licence reclaim executed', 'Copilot licence recovery protected', 'Cloud rightsizing completed', 'AI model route optimisation', 'Snowflake warehouse auto-suspend', 'SaaS owner cleanup', 'ServiceNow stale CI retirement']) assert.equal(text.includes(snippet), true)
  const rendered = renderProtectionWorkspaceState(demoProtectionOutcomes, true)
  assert.equal(rendered.hasDemoStory, true)
  assert.equal(rendered.kpis.valueProtected > 0, true)
})

test('Protection Evidence Pack COMPLETE vs PARTIAL and decisions are deterministic', () => {
  assert.equal(getProtectionEvidencePackCompleteness(demoProtectionOutcomes[0]).status, 'COMPLETE')
  assert.equal(getProtectionEvidencePackCompleteness({ executedAction: 'Action', sourceSystem: 'System' }).status, 'PARTIAL')
  assert.equal(inferProtectionDecision({ verificationResult: 'PASSED', postState: 'done', trustProofReference: 'proof' }).decision, 'VERIFIED')
  assert.equal(inferProtectionDecision({ verificationResult: 'PASSED', protectedOutcome: 'value', outcomeProtectionActive: true, trustProofReference: 'proof' }).decision, 'PROTECTED')
  assert.equal(inferProtectionDecision({ verificationResult: 'PASSED', driftStatus: 'DRIFT_DETECTED' }).decision, 'DRIFTING')
  assert.equal(inferProtectionDecision({ verificationResult: 'PASSED', rollbackStatus: 'READY' }).decision, 'ROLLBACK_READY')
  assert.equal(inferProtectionDecision({ verificationResult: 'FAILED' }).decision, 'ROLLBACK_REQUIRED')
  assert.equal(inferProtectionDecision({ verificationResult: 'PENDING' }).decision, 'REVIEW')
  assert.equal(inferProtectionDecision({ missingCriticalEvidence: true }).decision, 'BLOCKED')
})

test('Program 4 LIVE_UNCONNECTED contains no demo protection data and KPIs are mode-safe', () => {
  const rendered = renderProtectionWorkspaceState(emptyProtectionOutcomes, false)
  assert.equal(rendered.emptyLive, true)
  assert.equal(rendered.kpis.valueProtected, 0)
  assert.equal(rendered.kpis.trustEvidenceCoverage, undefined)
  assert.equal(emptyOutcomeProtectionData.dashboard.protectedAnnualValue, 0)
  assert.equal(summarizeOutcomeProtection([]).retentionRate, null)
  assert.deepEqual(normalizeOutcomes(undefined), [])
})

test('Protection navigation routes are concrete and page uses unified executive language', () => {
  const app = read('../App.tsx')
  const page = read('../pages/ProtectionWorkspace.tsx')
  for (const route of ['/protection', '/protection/:section', '/drift-monitor']) assert.equal(app.includes(route), true)
  for (const phrase of ['Unified Protection Workspace', 'Protection Evidence Pack and Proof Pack', 'Protection Decision Model', 'No demo executions, verifications, drift, rollback status, protected value, trust evidence, outcomes or confidence']) assert.equal(page.includes(phrase), true)
})
