import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getDefaultLandingPage, LANDING_PAGE_SECTIONS, TRUST_BANNER_ASSURANCES } from './defaultLandingPage'

const POSITIONING_DENYLIST = ['Best', 'World-class', 'Revolutionary', 'Game-changing']

function flattenStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) flattenStrings(item, out)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) flattenStrings(v, out)
  }
  return out
}

test('landing page content model has exactly 8 sections', () => {
  const page = getDefaultLandingPage()
  assert.equal(page.sections.length, 8)
  assert.equal(LANDING_PAGE_SECTIONS.length, 8)
  assert.deepEqual(
    page.sections.map((s) => s.title),
    [
      'Hero',
      'Market Problem',
      'Uncover, Execute, Protect',
      'Economic Control Chain',
      'Questions Certen Answers',
      'Governed Answers',
      'AI & Technology Exposure Report',
      'Executive Economic Review',
    ]
  )
})

test('Hero contains the verbatim two-line headline', () => {
  const page = getDefaultLandingPage()
  assert.deepEqual(page.hero.headlineLines, [
    'You approved the technology budget.',
    'Can you prove what it delivered?',
  ])
})

test('Hero subheadline and CTAs are verbatim', () => {
  const page = getDefaultLandingPage()
  assert.equal(
    page.hero.subheadline,
    'Certen helps organisations uncover value, execute improvements, validate outcomes, reconcile savings to finance and protect gains from drift.'
  )
  assert.equal(page.hero.primaryCta, 'Run Free M365 Exposure Review')
  assert.equal(page.hero.secondaryCta, 'See Economic Control Chain')
})

test('Trust Banner contains all 6 assurances verbatim', () => {
  const page = getDefaultLandingPage()
  const required = [
    'Read-only review',
    'No changes made',
    'Discovery only',
    'No licence modifications',
    'No automated execution',
    'Access can be revoked at any time',
  ]
  assert.equal(TRUST_BANNER_ASSURANCES.length, 6)
  for (const assurance of required) {
    assert.ok(page.hero.trustBanner.includes(assurance), `missing assurance: ${assurance}`)
  }
})

test('Economic Control Chain section contains all 7 stages in order', () => {
  const page = getDefaultLandingPage()
  assert.equal(page.economicControlChain.stages.length, 7)
  assert.deepEqual(
    page.economicControlChain.stages.map((s) => s.title),
    ['Discover', 'Own', 'Analyse', 'Approve', 'Execute', 'Verify', 'Protect']
  )
  for (const stage of page.economicControlChain.stages) {
    assert.ok(typeof stage.description === 'string' && stage.description.length > 0)
  }
})

test('Questions section is grouped by audience using catalog text verbatim by id', () => {
  const page = getDefaultLandingPage()
  const byAudience = Object.fromEntries(page.questionsByAudience.map((g) => [g.audience, g.questions]))

  assert.deepEqual(byAudience.CFO, [
    'What value has been verified?',
    'What value has finance validated?',
    'What variance exists between projected and finance-verified value?',
  ])
  assert.deepEqual(byAudience.CIO, [
    'What technology do we own?',
    'Where are we exposed?',
    'What should I do next?',
  ])
  assert.deepEqual(byAudience.EXECUTIVE, [
    'What requires attention?',
    'What value is protected?',
  ])
  assert.deepEqual(byAudience.ITAM, [
    'What authorities are available?',
    'What actions require approval?',
  ])
})

test('Governed Answers mentions Outcome Ledger, Evidence Registry and Finance Reconciliation', () => {
  const page = getDefaultLandingPage()
  const terms = page.governedAnswers.conceptCallouts.map((c) => c.term)
  assert.ok(terms.includes('Outcome Ledger'))
  assert.ok(terms.includes('Evidence Registry'))
  assert.ok(terms.includes('Finance Reconciliation'))
})

test('Governed Answers section never mentions Slack, Teams, MCP, or AI agents', () => {
  const page = getDefaultLandingPage()
  const text = flattenStrings(page.governedAnswers).join(' ').toLowerCase()
  assert.ok(!text.includes('slack'))
  assert.ok(!text.includes('teams'))
  assert.ok(!text.includes('mcp'))
  assert.ok(!text.includes('ai agent'))
})

test('Exposure Report section contains the CTA "Run Free M365 Exposure Review"', () => {
  const page = getDefaultLandingPage()
  assert.equal(page.exposureReportSection.cta, 'Run Free M365 Exposure Review')
})

test('Exposure Report section reuses the Section 1 metric labels and is marked illustrative', () => {
  const page = getDefaultLandingPage()
  const labels = page.exposureReportSection.metrics.map((m) => m.label)
  assert.deepEqual(labels, [
    'Potential Annual Value',
    'Inactive Licences',
    'Ownerless Licences',
    'Copilot Exposure',
    'Governance Findings',
  ])
  assert.ok(page.exposureReportSection.illustrativeNote.toLowerCase().includes('sample') || page.exposureReportSection.illustrativeNote.toLowerCase().includes('illustrat'))
})

test('Exposure Report section flow steps are verbatim, in order', () => {
  const page = getDefaultLandingPage()
  assert.deepEqual(page.exposureReportSection.flowSteps, [
    'Connect Microsoft 365.',
    'Receive an AI & Technology Exposure Report.',
    'No changes made.',
    'Results in minutes.',
  ])
})

test('Final CTA section contains "Book Executive Review" and verbatim headline/copy', () => {
  const page = getDefaultLandingPage()
  assert.equal(page.executiveReview.cta, 'Book Executive Review')
  assert.equal(
    page.executiveReview.headline,
    'Understand what you own, what you spend, what is exposed and what value can be proven.'
  )
  assert.equal(
    page.executiveReview.supportingCopy,
    'Review technology exposure, ownership, governance, opportunities, verified outcomes and protection readiness.'
  )
})

test('denylist: no banned superlative language anywhere in the content model', () => {
  const page = getDefaultLandingPage()
  const allStrings = flattenStrings(page)
  for (const str of allStrings) {
    for (const banned of POSITIONING_DENYLIST) {
      assert.ok(!str.includes(banned), `found banned word "${banned}" in: "${str}"`)
    }
  }
})

test('denylist: "AI spend management" is never used as positioning text', () => {
  const page = getDefaultLandingPage()
  const allText = flattenStrings(page).join(' ').toLowerCase()
  assert.ok(!allText.includes('ai spend management'))
})

test('Market Problem section has no hardcoded statistics in card copy', () => {
  const page = getDefaultLandingPage()
  for (const card of page.marketProblem.cards) {
    assert.ok(!/\d/.test(card.body), `card body should not contain digits/stats: "${card.body}"`)
  }
})
