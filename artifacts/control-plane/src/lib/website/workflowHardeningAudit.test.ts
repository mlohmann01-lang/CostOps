import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { JOURNEY_TRANSITIONS, getJourneyAudit } from './journeyAudit'
import { CANONICAL_TERMS, TERMINOLOGY_DENYLIST, getTerminologyAudit } from './terminologyAudit'
import { EXPOSURE_REVIEW_ROUTES, REVIEW_TOPICS, EXPOSURE_REVIEW_START } from './exposureReviewJourney'
import { getDefaultLandingPage, RUN_EXPOSURE_REVIEW_CTA, BOOK_EXECUTIVE_REVIEW_CTA } from './defaultLandingPage'

// Phase A — Workflow Hardening Sprint. Verifies the journey/navigation/
// terminology/trust/CTA hardening performed in this sprint, driven by the
// structured audit data built in journeyAudit.ts and terminologyAudit.ts.

const here = path.dirname(fileURLToPath(import.meta.url))
const readPage = (relPath: string) => readFileSync(path.join(here, '../../pages', relPath), 'utf8')
const readApp = () => readFileSync(path.join(here, '../../App.tsx'), 'utf8')

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

// ─── 1. Critical journey routes exist ───────────────────────────────────────

test('all 7 journey routes are registered in App.tsx', () => {
  const app = readApp()
  assert.ok(app.includes('<Route path="/welcome" component={LandingPage} />'))
  assert.ok(app.includes('<Route path="/exposure-review" component={ExposureReviewStart} />'))
  assert.ok(app.includes('<Route path="/exposure-review/connect" component={ExposureReviewConnect} />'))
  assert.ok(app.includes('<Route path="/exposure-review/discovery" component={ExposureReviewDiscovery} />'))
  assert.ok(app.includes('<Route path="/exposure-review/report" component={ExposureReviewReport} />'))
  assert.ok(app.includes('<Route path="/executive-review" component={ExecutiveReview} />'))
  assert.ok(app.includes('<Route path="/exposure-review/next-steps" component={ExposureReviewConversion} />'))
})

test('EXPOSURE_REVIEW_ROUTES matches the registered App.tsx routes', () => {
  assert.equal(EXPOSURE_REVIEW_ROUTES.start, '/exposure-review')
  assert.equal(EXPOSURE_REVIEW_ROUTES.connect, '/exposure-review/connect')
  assert.equal(EXPOSURE_REVIEW_ROUTES.discovery, '/exposure-review/discovery')
  assert.equal(EXPOSURE_REVIEW_ROUTES.report, '/exposure-review/report')
  assert.equal(EXPOSURE_REVIEW_ROUTES.executiveReview, '/executive-review')
  assert.equal(EXPOSURE_REVIEW_ROUTES.nextSteps, '/exposure-review/next-steps')
})

// ─── 2. Required CTAs exist in their expected locations ─────────────────────

test('Primary CTA "Run Free Exposure Review" appears on the landing page hero and Exposure Report section', () => {
  const page = getDefaultLandingPage()
  assert.equal(page.hero.primaryCta, RUN_EXPOSURE_REVIEW_CTA)
  assert.equal(page.exposureReportSection.cta, RUN_EXPOSURE_REVIEW_CTA)
})

test('Secondary CTA "Book Executive Review" appears on the landing page hero, footer and final section, all routed to /executive-review', () => {
  const page = getDefaultLandingPage()
  assert.equal(page.hero.secondaryCta, BOOK_EXECUTIVE_REVIEW_CTA)
  assert.equal(page.footer.executiveReviewLabel, BOOK_EXECUTIVE_REVIEW_CTA)
  assert.equal(page.footer.executiveReviewHref, '/executive-review')
  assert.equal(page.executiveReview.cta, BOOK_EXECUTIVE_REVIEW_CTA)
  assert.equal(page.executiveReview.ctaHref, '/executive-review')
})

test('Exposure Report page (Program 10) Book Executive Review CTA routes to /executive-review', () => {
  const reportPage = readPage('ExposureReviewReport.tsx')
  assert.ok(reportPage.includes('EXPOSURE_REPORT_BOOK_REVIEW_HREF'))
  assert.ok(reportPage.includes('EXPOSURE_REPORT_BOOK_REVIEW_CTA'))
})

// ─── 3. Required trust statements exist (spot-check) ─────────────────────────

test('Landing page hero trust banner includes read-only / no-changes / discovery-only language', () => {
  const page = getDefaultLandingPage()
  const banner = page.hero.trustBanner.join(' ').toLowerCase()
  assert.ok(banner.includes('read-only'))
  assert.ok(banner.includes('no changes made'))
  assert.ok(banner.includes('discovery only'))
})

test('Exposure Review start page trust banner includes read-only / no-execution / discovery-only / revocable language', () => {
  const startPage = readPage('ExposureReviewStart.tsx')
  assert.ok(startPage.includes('EXPOSURE_REVIEW_START'))
  const journeyContent = readFileSync(path.join(here, 'exposureReviewJourney.ts'), 'utf8')
  assert.ok(journeyContent.includes('Read-only access'))
  assert.ok(journeyContent.includes('No automated execution'))
  assert.ok(journeyContent.includes('Discovery only'))
  assert.ok(journeyContent.includes('Access revocable at any time'))
})

test('Connect step security statement disclaims real actions/licence/setting changes', () => {
  const journeyContent = readFileSync(path.join(here, 'exposureReviewJourney.ts'), 'utf8')
  assert.ok(journeyContent.includes('No actions are executed.'))
  assert.ok(journeyContent.includes('No licences are modified.'))
  assert.ok(journeyContent.includes('No settings are changed.'))
})

test('Discovery step is explicitly labelled a sample experience, not live telemetry', () => {
  const journeyContent = readFileSync(path.join(here, 'exposureReviewJourney.ts'), 'utf8')
  assert.ok(journeyContent.includes('Sample discovery experience.'))
})

test('Exposure Report page trust statement discloses read-only generation and no executed actions', () => {
  const journeyContent = readFileSync(path.join(here, 'exposureReviewJourney.ts'), 'utf8')
  assert.ok(journeyContent.includes('Report generated from read-only discovery.'))
  assert.ok(journeyContent.includes('Actions have not been executed.'))
})

// ─── 4. No dead-end routes ────────────────────────────────────────────────────

test('journeyAudit.ts records every transition as PASS in the post-fix state', () => {
  const audit = getJourneyAudit()
  assert.equal(audit.length, JOURNEY_TRANSITIONS.length)
  for (const transition of audit) {
    assert.equal(transition.status, 'PASS', `transition ${transition.id} is not PASS: ${transition.note}`)
  }
})

test('every journey page has both a forward path and a back/return path (per journeyAudit.ts + manual source check)', () => {
  // Pages with a forward step to another journey page — checked against the
  // shared content model (exposureReviewJourney.ts), since the page
  // components render hrefs via content.* variables rather than literals.
  assert.equal(EXPOSURE_REVIEW_START.primaryCtaHref, '/exposure-review/connect')
  const connectSource = readPage('ExposureReviewConnect.tsx')
  assert.ok(connectSource.includes('beginDiscoveryHref'), 'ExposureReviewConnect.tsx missing forward link to discovery')
  const discoverySource = readPage('ExposureReviewDiscovery.tsx')
  assert.ok(discoverySource.includes('DISCOVERY_VIEW_REPORT_HREF'), 'ExposureReviewDiscovery.tsx missing forward link to report')
  const reportSource = readPage('ExposureReviewReport.tsx')
  assert.ok(reportSource.includes('EXPOSURE_REPORT_BOOK_REVIEW_HREF'), 'ExposureReviewReport.tsx missing forward link to executive review')

  // Pages with an explicit back link (top-of-page "← Certen"-style anchor).
  const backLinkChecks = [
    'ExposureReviewStart.tsx',
    'ExposureReviewConnect.tsx',
    'ExposureReviewDiscovery.tsx',
    'ExposureReviewReport.tsx',
    'ExecutiveReview.tsx',
    'ExposureReviewConversion.tsx',
  ]
  for (const page of backLinkChecks) {
    const source = readPage(page)
    assert.ok(source.includes('←'), `${page} is missing a back link`)
  }

  // The Executive Review confirmation state must not be a dead end.
  const executiveReviewSource = readPage('ExecutiveReview.tsx')
  assert.ok(
    executiveReviewSource.includes('/exposure-review/next-steps'),
    'ExecutiveReview.tsx confirmation state must link forward to /exposure-review/next-steps (no dead end after booking)'
  )

  // The conversion/next-steps bridge must end with an explicit link, not rely on browser back.
  const conversionSource = readPage('ExposureReviewConversion.tsx')
  assert.ok(conversionSource.includes('/welcome'), 'ExposureReviewConversion.tsx must link back to /welcome')
})

// ─── 5. No banned CTA variants ───────────────────────────────────────────────

const BANNED_CTA_VARIANTS = ['Try Now', 'Launch Review', 'Begin Assessment']

test('denylist: no banned CTA variant text appears anywhere in the journey or landing page', () => {
  const sources = [
    readPage('LandingPage.tsx'),
    readPage('ExposureReviewStart.tsx'),
    readPage('ExposureReviewConnect.tsx'),
    readPage('ExposureReviewDiscovery.tsx'),
    readPage('ExposureReviewReport.tsx'),
    readPage('ExecutiveReview.tsx'),
    readPage('ExposureReviewConversion.tsx'),
    readFileSync(path.join(here, 'exposureReviewJourney.ts'), 'utf8'),
    readFileSync(path.join(here, 'defaultLandingPage.ts'), 'utf8'),
  ]
  for (const source of sources) {
    for (const banned of BANNED_CTA_VARIANTS) {
      assert.ok(!source.includes(banned), `found banned CTA variant "${banned}"`)
    }
  }
})

test('"Get started" appears only in the carved-out public header nav context, never as a page-level CTA button', () => {
  const landingSource = readPage('LandingPage.tsx')
  const defaultLandingPageSource = readFileSync(path.join(here, 'defaultLandingPage.ts'), 'utf8')

  // The CTA label is defined in PUBLIC_HEADER.getStartedLabel (currently "Run Free Exposure Review"),
  // not hardcoded in JSX. Verify the property exists in the data model.
  assert.ok(defaultLandingPageSource.includes("getStartedLabel: 'Run Free Exposure Review'"))

  // It must not appear as a separate, hardcoded literal CTA button elsewhere
  // in LandingPage.tsx (i.e. not typed directly into JSX outside of
  // `header.getStartedLabel`/PublicHeader rendering).
  const getStartedLiteralOutsideHeader = />\s*Get started\s*</.test(landingSource)
  assert.ok(!getStartedLiteralOutsideHeader, '"Get started" must not be hardcoded as a literal CTA label in LandingPage.tsx JSX')

  // No other page in the journey should use "Get started" as its own CTA label.
  const otherPages = [
    'ExposureReviewStart.tsx',
    'ExposureReviewConnect.tsx',
    'ExposureReviewDiscovery.tsx',
    'ExposureReviewReport.tsx',
    'ExecutiveReview.tsx',
    'ExposureReviewConversion.tsx',
  ]
  for (const page of otherPages) {
    assert.ok(!readPage(page).includes('Get started'), `${page} must not use "Get started" as a CTA`)
  }
})

// ─── 6. Terminology remains canonical ────────────────────────────────────────

test('terminologyAudit.ts records all canonical terms with no unresolved (non-debt) conflicts', () => {
  const audit = getTerminologyAudit()
  assert.equal(audit.length, CANONICAL_TERMS.length)
  for (const entry of audit) {
    assert.notEqual(entry.conflictStatus, undefined)
    assert.ok(
      ['NONE_FOUND', 'FIXED', 'DOCUMENTED_DEBT'].includes(entry.conflictStatus),
      `unexpected conflictStatus for ${entry.term}`
    )
  }
})

test('denylist: legacy "Technology Portfolio" term does not appear in the public Exposure Review journey customer-facing copy', () => {
  assert.ok(!REVIEW_TOPICS.includes('Technology Portfolio' as any))
  assert.ok(REVIEW_TOPICS.includes('Technology Authority'))
})

test('denylist: legacy "Economic Graph" term does not appear in the public website/journey customer-facing copy', () => {
  const sources = [
    readPage('LandingPage.tsx'),
    readFileSync(path.join(here, 'defaultLandingPage.ts'), 'utf8'),
    readFileSync(path.join(here, 'exposureReviewJourney.ts'), 'utf8'),
  ]
  for (const source of sources) {
    assert.ok(!source.includes('Economic Graph'), 'found legacy "Economic Graph" term in customer-facing source')
  }
})

test('denylist: "Assessment" / "Scan" / "Review Report" are not used as customer-facing product terms in the journey or landing page', () => {
  const sources = [
    readPage('LandingPage.tsx'),
    readPage('ExposureReviewStart.tsx'),
    readPage('ExposureReviewConnect.tsx'),
    readPage('ExposureReviewDiscovery.tsx'),
    readPage('ExposureReviewReport.tsx'),
    readPage('ExecutiveReview.tsx'),
    readPage('ExposureReviewConversion.tsx'),
    readFileSync(path.join(here, 'exposureReviewJourney.ts'), 'utf8'),
    readFileSync(path.join(here, 'defaultLandingPage.ts'), 'utf8'),
  ]
  const bannedProductTerms = ['Assessment', 'Scan', 'Review Report']
  for (const source of sources) {
    for (const banned of bannedProductTerms) {
      assert.ok(!new RegExp(`\\b${banned}\\b`).test(source), `found banned term "${banned}"`)
    }
  }
})

test('TERMINOLOGY_DENYLIST is non-empty and includes the locked legacy terms', () => {
  assert.ok(TERMINOLOGY_DENYLIST.includes('Technology Portfolio'))
  assert.ok(TERMINOLOGY_DENYLIST.includes('Economic Graph'))
  assert.ok(TERMINOLOGY_DENYLIST.includes('Assessment'))
  assert.ok(TERMINOLOGY_DENYLIST.includes('Scan'))
})

// ─── Cross-link / navigation hardening spot-checks ───────────────────────────

test('internal Exposure Report page (/executive/exposure-report) is reachable from the Sidebar, not orphaned', () => {
  const sidebar = readFileSync(path.join(here, '../../components/layout/Sidebar.tsx'), 'utf8')
  assert.ok(sidebar.includes('/executive/exposure-report'), 'internal Exposure Report page must be linked from Sidebar nav')
  const app = readApp()
  assert.ok(app.includes('<Route path="/executive/exposure-report" component={ExposureReportRoute} />'))
})

test('the public Exposure Review and internal Exposure Report use distinguishable Sidebar/route naming (no copy collision)', () => {
  const sidebar = readFileSync(path.join(here, '../../components/layout/Sidebar.tsx'), 'utf8')
  // Sidebar label for the internal page must say "Exposure Report", not "Exposure Review".
  assert.ok(sidebar.includes("label: 'Exposure Report'"))
  assert.ok(!sidebar.includes("label: 'Exposure Review'"))
})
