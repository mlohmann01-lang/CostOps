import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { getEvidencePackCompleteness, program1ExecutiveRoutes } from './program1Acceptance'
import { demoActionCenterData } from '../hooks/useActionCenterData'
import { demoApprovalCenterData } from '../hooks/useApprovalCenterData'
import { demoExecutiveValueSummary } from '../data/demo'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Program 1 DEMO mode has executive demo content', () => {
  assert.equal(demoActionCenterData.isDemo, true)
  assert.ok(demoActionCenterData.actions.length >= 5)
  assert.equal(demoApprovalCenterData.isDemo, true)
  assert.ok(demoApprovalCenterData.requests.length >= 3)
  assert.ok(Number(demoExecutiveValueSummary.valueMetrics?.projectedAnnualSavings ?? 0) > 0)
})

test('Program 1 LIVE_UNCONNECTED state does not expose demo content', () => {
  const actionHook = read('../hooks/useActionCenterData.ts')
  const approvalHook = read('../hooks/useApprovalCenterData.ts')
  const outcomeHook = read('../hooks/useOutcomeProofData.ts')
  assert.match(actionHook, /notConnectedActionCenterData:[\s\S]*isDemo: false/)
  assert.match(approvalHook, /workspace\.mode === 'demo'[\s\S]*demoApprovalCenterData/)
  assert.doesNotMatch(approvalHook, /catch[\s\S]{0,240}demoApprovalCenterData/)
  assert.match(outcomeHook, /dataState:[\s\S]*'NOT_CONNECTED'/)
})

test('Evidence pack completeness distinguishes COMPLETE vs PARTIAL', () => {
  const complete = getEvidencePackCompleteness({ source: 'M365', owner: 'CFO', actionOrRecommendation: 'Reclaim seats', decision: 'Approved', valueBasis: '$4,200/month', verificationStatus: 'VERIFIED', confidence: 'HIGH', timestamps: { generatedAt: '2026-07-05T00:00:00Z' }, outcomeOrProtectionState: 'Protected' })
  assert.equal(complete.status, 'COMPLETE')
  assert.deepEqual(complete.missing, [])
  const partial = getEvidencePackCompleteness({ source: 'M365', owner: 'CFO', decision: 'Pending' })
  assert.equal(partial.status, 'PARTIAL')
  assert.ok(partial.missing.includes('actionOrRecommendation'))
  assert.ok(partial.missing.includes('valueBasis'))
})

test('Program 1 executive headings and decision questions are present', () => {
  const sources = [
    read('../pages/ActionCenter.tsx'),
    read('../pages/ApprovalCenter.tsx'),
    read('../pages/ExecutiveValueDashboard.tsx'),
    read('../pages/OutcomeLedgerView.tsx'),
    read('../pages/EvidenceRegistry.tsx'),
    read('../pages/ExecutiveProofPacks.tsx'),
  ].join('\n')
  for (const route of program1ExecutiveRoutes) {
    assert.ok(sources.includes(route.name) || (route.name.includes('Evidence Pack') && sources.includes('Evidence Trust Center')), route.name)
  }
  for (const question of ['What can safely be executed next?', 'What decisions require approval today?', 'What value has actually been realised and protected?', 'Can each claim be defended']) {
    assert.ok(sources.includes(question), question)
  }
})
