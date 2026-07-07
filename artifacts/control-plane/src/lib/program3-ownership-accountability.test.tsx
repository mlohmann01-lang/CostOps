import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildOwnershipEvidencePack, demoOwnershipIntelligenceData, emptyOwnershipData, summarizeOwnershipKpis } from '../hooks/useOwnershipIntelligenceData'
import { renderOwnershipAccountabilityState } from '../pages/OwnershipIntelligence'
import { getOwnershipEvidencePackCompleteness, inferOwnershipDecision, program3OwnershipRoute } from './program3OwnershipAccountability'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Ownership & Accountability DEMO renders coherent accountability scenarios', () => {
  const data = demoOwnershipIntelligenceData()
  const rendered = renderOwnershipAccountabilityState(data, true)
  assert.equal(rendered.title, 'Ownership & Accountability')
  assert.equal(rendered.question, program3OwnershipRoute.question)
  assert.ok(rendered.governedAssets >= 7)
  assert.ok(rendered.assetsMissingOwner >= 2)
  assert.ok(rendered.decisions.includes('VERIFIED'))
  assert.ok(rendered.decisions.includes('ASSIGN'))
  assert.ok(rendered.decisions.includes('REVIEW'))
  assert.ok(rendered.decisions.includes('BLOCKED'))
})

test('Ownership & Accountability LIVE_UNCONNECTED contains no demo ownership information', () => {
  const rendered = renderOwnershipAccountabilityState(emptyOwnershipData, false)
  assert.equal(rendered.demoBanner, '')
  assert.equal(rendered.empty, true)
  assert.equal(rendered.governedAssets, 0)
  assert.equal(rendered.assetsMissingOwner, 0)
  assert.equal(rendered.verifiedOwnership, 0)
  assert.equal(rendered.findings, 0)
  assert.deepEqual(rendered.decisions, [])
})

test('Ownership Evidence Pack COMPLETE vs PARTIAL works', () => {
  const complete = getOwnershipEvidencePackCompleteness({ assetIdentifier:'asset-m365', ownerIdentity:'Jane Owner', ownerType:'RESPONSIBLE_OWNER', businessUnit:'IT', costCentre:'IT-100', assignmentBasis:'HR and contract match', executiveSponsor:'CIO', renewalResponsibility:'IT Commercial Lead', decisionAuthority:'CIO', verificationStatus:'VERIFIED', confidence:'HIGH', sourceSystem:'HRIS', timestamp:'2026-07-05T00:00:00Z', lineage:'hris/owner/123', outcomeProtectionLinkage:'outcome:m365', executiveSponsorApplicable:true, renewalApplicable:true, outcomeApplicable:true })
  assert.equal(complete.status, 'COMPLETE')
  assert.deepEqual(complete.missing, [])
  const partial = getOwnershipEvidencePackCompleteness({ assetIdentifier:'asset-crm', ownerType:'RESPONSIBLE_OWNER', verificationStatus:'PENDING', confidence:'LOW', sourceSystem:'Contracts', executiveSponsorApplicable:true, renewalApplicable:true })
  assert.equal(partial.status, 'PARTIAL')
  assert.ok(partial.missing.includes('ownerIdentity'))
  assert.ok(partial.missing.includes('businessUnit'))
  assert.ok(partial.missing.includes('executiveSponsor'))
})

test('Ownership decision rules map gaps to ASSIGN REVIEW ESCALATE and BLOCKED', () => {
  assert.equal(inferOwnershipDecision({ ownerStatus:'MISSING', evidenceStatus:'COMPLETE', executiveSponsor:'CIO' }).decision, 'ASSIGN')
  assert.equal(inferOwnershipDecision({ ownerIdentity:'Owner A', ownerConflict:true, evidenceStatus:'COMPLETE', executiveSponsor:'COO' }).decision, 'REVIEW')
  assert.equal(inferOwnershipDecision({ ownerIdentity:'Owner A', evidenceStatus:'COMPLETE' }).decision, 'ESCALATE')
  assert.equal(inferOwnershipDecision({ ownerIdentity:'Owner A', executiveSponsor:'CIO', evidenceStatus:'PARTIAL' }).decision, 'BLOCKED')
  assert.equal(inferOwnershipDecision({ ownerIdentity:'Owner A', ownerStatus:'DEPARTED', executiveSponsor:'CDO', evidenceStatus:'COMPLETE' }).decision, 'REASSIGN')
})

test('Ownership KPI values remain mode-safe', () => {
  const live = summarizeOwnershipKpis(emptyOwnershipData)
  assert.equal(live.governedAssets, 0)
  assert.equal(live.assetsMissingOwner, 0)
  assert.equal(live.executiveSponsorshipCoverage, undefined)
  const demo = summarizeOwnershipKpis(demoOwnershipIntelligenceData())
  assert.ok(demo.governedAssets > 0)
  assert.ok(demo.highRiskOrphanedAssets > 0)
})

test('Demo data cannot leak into LIVE_UNCONNECTED and page has executive language', () => {
  const page = read('../pages/OwnershipIntelligence.tsx')
  const hook = read('../hooks/useOwnershipIntelligenceData.ts')
  const app = read('../App.tsx')
  assert.ok(page.includes('Ownership & Accountability'))
  assert.ok(page.includes(program3OwnershipRoute.question))
  assert.ok(page.includes('No live owners, executives, departments, contracts, assets, accountability statuses, recommendations, or organisational structures'))
  assert.ok(hook.includes('!workspace.dataReady'))
  assert.doesNotMatch(hook, /catch[\s\S]{0,220}demoOwnershipIntelligenceData/)
  assert.ok(app.includes('/ownership-accountability'))
})

test('Demo ownership evidence packs honestly mark partial evidence', () => {
  const data = demoOwnershipIntelligenceData()
  const statuses = data.findings.map((finding) => buildOwnershipEvidencePack(finding).status)
  assert.ok(statuses.includes('COMPLETE'))
  assert.ok(statuses.includes('PARTIAL'))
})
