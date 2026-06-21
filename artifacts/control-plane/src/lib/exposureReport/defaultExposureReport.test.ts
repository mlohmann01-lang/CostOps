import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getDefaultExposureReport,
  MAX_KEY_FINDINGS,
  EXPOSURE_DOMAIN_NAMES,
  TRUST_ASSURANCES,
  REPORT_TITLE,
} from './defaultExposureReport'

const PAST_TENSE_ACTION_DENYLIST = [
  'Removed',
  'removed',
  'Disabled',
  'disabled',
  'Executed',
  'executed',
  'Changed',
  'changed',
  'Modified',
  'modified',
  'Deleted',
  'deleted',
  'Revoked',
  'revoked',
]

test('report title is exactly "AI & Technology Exposure Report" and never the M365-only framing', () => {
  const report = getDefaultExposureReport()
  assert.equal(report.title, 'AI & Technology Exposure Report')
  assert.equal(REPORT_TITLE, 'AI & Technology Exposure Report')
  assert.ok(!report.title.toLowerCase().includes('microsoft 365 optimisation'))
})

test('report model has exactly 6 sections', () => {
  const report = getDefaultExposureReport()
  assert.equal(report.sections.length, 6)
  assert.deepEqual(
    report.sections.map((s) => s.title),
    [
      'Executive Summary',
      'Key Findings',
      'Exposure Domains',
      'Economic Control Readiness',
      'What Happens Next',
      'About This Review',
    ]
  )
})

test('Key Findings has at most MAX_KEY_FINDINGS (5) findings, hard cap enforced', () => {
  assert.equal(MAX_KEY_FINDINGS, 5)
  const report = getDefaultExposureReport()
  assert.ok(report.keyFindings.length <= MAX_KEY_FINDINGS)
  assert.ok(report.keyFindings.length > 0)
})

test('each key finding has finding, impact, recommendedAction fields', () => {
  const report = getDefaultExposureReport()
  for (const finding of report.keyFindings) {
    assert.ok(typeof finding.finding === 'string' && finding.finding.length > 0)
    assert.ok(typeof finding.impact === 'string' && finding.impact.length > 0)
    assert.ok(typeof finding.recommendedAction === 'string' && finding.recommendedAction.length > 0)
  }
})

test('Exposure Domains shows exactly the 5 required domains', () => {
  const report = getDefaultExposureReport()
  assert.equal(report.domains.length, 5)
  assert.deepEqual(report.domains.map((d) => d.domain), EXPOSURE_DOMAIN_NAMES)
  assert.deepEqual(EXPOSURE_DOMAIN_NAMES, ['Microsoft 365', 'AI', 'Ownership', 'Governance', 'Renewals'])
})

test('Exposure Domains other than Microsoft 365 are not empty/zeroed out', () => {
  const report = getDefaultExposureReport()
  const nonM365 = report.domains.filter((d) => d.domain !== 'Microsoft 365')
  assert.equal(nonM365.length, 4)
  for (const domain of nonM365) {
    assert.ok(typeof domain.status === 'string' && domain.status.length > 0)
    assert.ok(domain.issueCount !== undefined)
  }
})

test('Economic Control Readiness reuses the chain and shows exactly 7 stages', () => {
  const report = getDefaultExposureReport()
  assert.equal(report.economicControlChain.stages.length, 7)
  assert.deepEqual(
    report.economicControlChain.stages.map((s) => s.key),
    ['DISCOVER', 'OWN', 'ANALYSE', 'APPROVE', 'EXECUTE', 'VERIFY', 'PROTECT']
  )
})

test('What Happens Next shows the exact 6-step sequence verbatim, in order', () => {
  const report = getDefaultExposureReport()
  assert.equal(report.nextSteps.length, 6)
  assert.deepEqual(
    report.nextSteps.map((s) => s.label),
    [
      'Validate Findings',
      'Assign Ownership',
      'Review Opportunities',
      'Approve Actions',
      'Verify Outcomes',
      'Protect Value',
    ]
  )
  report.nextSteps.forEach((s, i) => assert.equal(s.step, i + 1))
})

test('About This Review contains all 6 required trust assurances', () => {
  const report = getDefaultExposureReport()
  const required = [
    'Read-only review',
    'No changes made',
    'Discovery only',
    'No licence modifications',
    'No automated execution',
    'Access can be revoked at any time',
  ]
  assert.equal(TRUST_ASSURANCES.length, 6)
  for (const assurance of required) {
    assert.ok(report.trustAssurances.includes(assurance), `missing assurance: ${assurance}`)
  }
})

test('bottom expansion block references AI, SaaS, Cloud, Renewals and Ownership', () => {
  const report = getDefaultExposureReport()
  const text = report.expansionBlock.toLowerCase()
  assert.ok(text.includes('ai'))
  assert.ok(text.includes('saas'))
  assert.ok(text.includes('cloud'))
  assert.ok(text.includes('renewals'))
  assert.ok(text.includes('ownership'))
})

test('no past-tense execution/action language anywhere in findings, recommended actions, or domain statuses', () => {
  const report = getDefaultExposureReport()
  // Note: trust assurances are intentionally excluded — "revoked" there describes a
  // safeguard ("access can be revoked"), not a claim that an action was already taken.
  const strings: string[] = [
    report.expansionBlock,
    ...report.keyFindings.flatMap((f) => [f.finding, f.impact, f.recommendedAction]),
    ...report.domains.map((d) => d.status),
  ]
  for (const str of strings) {
    for (const banned of PAST_TENSE_ACTION_DENYLIST) {
      assert.ok(!str.includes(banned), `found banned past-tense action word "${banned}" in: "${str}"`)
    }
  }
})

test('summary metrics that are unavailable remain undefined rather than fabricated (honest data bias)', () => {
  const report = getDefaultExposureReport()
  assert.equal(report.summary.copilotExposure, undefined)
})
