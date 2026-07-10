import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getDefaultExposureReport } from '../exposureReport/defaultExposureReport'
import {
  EXPOSURE_REVIEW_ROUTES,
  EXPOSURE_REVIEW_START,
  EXPOSURE_REVIEW_START_TRUST_BANNER,
  EXPOSURE_REVIEW_CONNECT,
  REQUESTED_PERMISSIONS,
  CONNECT_SECURITY_STATEMENT,
  DISCOVERY_STEPS,
  DISCOVERY_SAMPLE_LABEL,
  DISCOVERY_COMPLETE_HEADLINE,
  DISCOVERY_COMPLETE_SUBHEADLINE,
  EXPOSURE_REPORT_TRUST_STATEMENT,
  EXPOSURE_REPORT_BOOK_REVIEW_HREF,
  EXPOSURE_REPORT_EXPLORE_PLATFORM_HREF,
  PREFERRED_TIMEFRAMES,
  REVIEW_TOPICS,
  EXECUTIVE_REVIEW_CONFIRMATION_HEADLINE,
  CONVERSION_STAGES,
} from './exposureReviewJourney'

const here = path.dirname(fileURLToPath(import.meta.url))
const readPage = (relPath: string) => readFileSync(path.join(here, '../../pages', relPath), 'utf8')

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

// ─── 1. Exposure Review route exists ────────────────────────────────────────

test('Exposure Review start route is /exposure-review and registered in App.tsx', () => {
  assert.equal(EXPOSURE_REVIEW_ROUTES.start, '/exposure-review')
  const app = readFileSync(path.join(here, '../../App.tsx'), 'utf8')
  assert.ok(app.includes("<Route path=\"/exposure-review\" component={ExposureReviewStart} />"))
})

test('Exposure Review start headline, subheadline and CTA are present', () => {
  assert.equal(EXPOSURE_REVIEW_START.headline, 'Run a Free Microsoft 365 Exposure Review')
  assert.ok(EXPOSURE_REVIEW_START.subheadline.includes('unused licences'))
  assert.equal(EXPOSURE_REVIEW_START.primaryCta, 'Connect Microsoft 365')
  assert.equal(EXPOSURE_REVIEW_START.primaryCtaHref, EXPOSURE_REVIEW_ROUTES.connect)
})

test('Exposure Review start trust banner has 5 assurances', () => {
  assert.equal(EXPOSURE_REVIEW_START_TRUST_BANNER.length, 5)
  for (const item of [
    'Read-only access',
    'No licence changes',
    'No automated execution',
    'Discovery only',
    'Access revocable at any time',
  ]) {
    assert.ok(EXPOSURE_REVIEW_START_TRUST_BANNER.includes(item), `missing: ${item}`)
  }
})

// ─── 2. Connect step exists ─────────────────────────────────────────────────

test('Connect route is /exposure-review/connect and registered in App.tsx', () => {
  assert.equal(EXPOSURE_REVIEW_ROUTES.connect, '/exposure-review/connect')
  const app = readFileSync(path.join(here, '../../App.tsx'), 'utf8')
  assert.ok(app.includes("<Route path=\"/exposure-review/connect\" component={ExposureReviewConnect} />"))
})

test('Connect step requests the correct permissions', () => {
  assert.deepEqual(REQUESTED_PERMISSIONS, ['User.Read.All', 'Directory.Read.All', 'Reports.Read.All', 'AuditLog.Read.All'])
  assert.deepEqual(EXPOSURE_REVIEW_CONNECT.permissions, REQUESTED_PERMISSIONS)
})

test('Connect step security statement copy is present verbatim', () => {
  assert.deepEqual(CONNECT_SECURITY_STATEMENT, [
    'Certen performs read-only discovery during the Exposure Review.',
    'No actions are executed.',
    'No licences are modified.',
    'No settings are changed.',
  ])
})

test('Connect step leads to Begin Discovery -> /exposure-review/discovery', () => {
  assert.equal(EXPOSURE_REVIEW_CONNECT.beginDiscoveryCta, 'Begin Discovery')
  assert.equal(EXPOSURE_REVIEW_CONNECT.beginDiscoveryHref, EXPOSURE_REVIEW_ROUTES.discovery)
})

// ─── 3. Discovery step exists ───────────────────────────────────────────────

test('Discovery route is /exposure-review/discovery and registered in App.tsx', () => {
  assert.equal(EXPOSURE_REVIEW_ROUTES.discovery, '/exposure-review/discovery')
  const app = readFileSync(path.join(here, '../../App.tsx'), 'utf8')
  assert.ok(app.includes("<Route path=\"/exposure-review/discovery\" component={ExposureReviewDiscovery} />"))
})

test('Discovery has all 6 steps in order', () => {
  assert.equal(DISCOVERY_STEPS.length, 6)
  assert.deepEqual(
    DISCOVERY_STEPS.map((s) => s.label),
    ['Identities', 'Licences', 'Applications', 'Owners', 'Governance Signals', 'Value Opportunities']
  )
})

test('Discovery is explicitly labelled as a sample experience', () => {
  assert.equal(DISCOVERY_SAMPLE_LABEL, 'Sample discovery experience.')
})

test('Discovery completion state shows Discovery Complete / Exposure Report Ready', () => {
  assert.equal(DISCOVERY_COMPLETE_HEADLINE, 'Discovery Complete')
  assert.equal(DISCOVERY_COMPLETE_SUBHEADLINE, 'Exposure Report Ready')
})

// ─── 4. Report step reuses the Exposure Report model ────────────────────────

test('Report page reuses defaultExposureReport.ts data — no parallel model', () => {
  const reportA = getDefaultExposureReport()
  const reportB = getDefaultExposureReport()
  assert.deepEqual(reportA, reportB)
  assert.equal(reportA.summary.potentialAnnualValue, 320000)
  assert.equal(reportA.summary.inactiveLicences, 184)
  assert.equal(reportA.summary.ownerlessLicences, 47)
  assert.equal(reportA.summary.governanceFindings, 12)
  assert.ok(reportA.keyFindings.length <= 5)

  // The report page source must import getDefaultExposureReport from the
  // canonical module rather than redefining a parallel data shape.
  const pageSource = readPage('ExposureReviewReport.tsx')
  assert.ok(pageSource.includes("from '../lib/exposureReport/defaultExposureReport'"))
  assert.ok(pageSource.includes('getDefaultExposureReport()'))
})

test('Report page CTAs route to /executive-review and /exposure-review/next-steps', () => {
  assert.equal(EXPOSURE_REPORT_BOOK_REVIEW_HREF, '/executive-review')
  assert.equal(EXPOSURE_REPORT_EXPLORE_PLATFORM_HREF, '/exposure-review/next-steps')
})

test('Report page trust statement copy is present verbatim', () => {
  assert.deepEqual(EXPOSURE_REPORT_TRUST_STATEMENT, [
    'Report generated from read-only discovery.',
    'Actions have not been executed.',
  ])
})

// ─── 5. Executive Review page exists ────────────────────────────────────────

test('Executive Review route is /executive-review and registered in App.tsx', () => {
  assert.equal(EXPOSURE_REVIEW_ROUTES.executiveReview, '/executive-review')
  const app = readFileSync(path.join(here, '../../App.tsx'), 'utf8')
  assert.ok(app.includes("<Route path=\"/executive-review\" component={ExecutiveReview} />"))
})

test('Executive Review has all preferred timeframe options', () => {
  assert.deepEqual(PREFERRED_TIMEFRAMES, ['Immediately', 'This Week', 'Next Week', 'This Month'])
})

test('Executive Review has all review topic options', () => {
  assert.deepEqual(REVIEW_TOPICS, ['M365', 'AI', 'Cloud', 'ITAM', 'Technology Authority'])
})

test('Executive Review confirmation message is present', () => {
  assert.equal(EXECUTIVE_REVIEW_CONFIRMATION_HEADLINE, 'Executive Review Request Submitted')
})

test('Executive Review page fields are present in the page source', () => {
  const pageSource = readPage('ExecutiveReview.tsx')
  for (const field of ['Name', 'Company', 'Email', 'Role', 'Preferred Timeframe', 'Review Topics']) {
    assert.ok(pageSource.includes(field), `missing field label: ${field}`)
  }
})

// ─── 6. Conversion Bridge page exists ───────────────────────────────────────

test('Conversion route is /exposure-review/next-steps and registered in App.tsx', () => {
  assert.equal(EXPOSURE_REVIEW_ROUTES.nextSteps, '/exposure-review/next-steps')
  const app = readFileSync(path.join(here, '../../App.tsx'), 'utf8')
  assert.ok(app.includes("<Route path=\"/exposure-review/next-steps\" component={ExposureReviewConversion} />"))
})

test('Conversion Bridge has all 5 stages in order', () => {
  assert.equal(CONVERSION_STAGES.length, 5)
  assert.deepEqual(
    CONVERSION_STAGES.map((s) => s.title),
    ['Technology Authority', 'Economic Control Chain', 'Outcome Finance', 'Outcome Protection', 'Executive Command Center']
  )
  for (const stage of CONVERSION_STAGES) {
    assert.ok(stage.description.length > 0)
  }
})

// ─── 7. Trust statements exist ──────────────────────────────────────────────

test('Trust statements from Parts 1, 2 and 4 are present verbatim', () => {
  assert.ok(EXPOSURE_REVIEW_START_TRUST_BANNER.includes('Read-only access'))
  assert.ok(CONNECT_SECURITY_STATEMENT.includes('Certen performs read-only discovery during the Exposure Review.'))
  assert.ok(EXPOSURE_REPORT_TRUST_STATEMENT.includes('Report generated from read-only discovery.'))
})

// ─── 8 & 9. No execution / no licence-modification language ────────────────

const EXECUTION_DENYLIST = ['Removed', 'Disabled', 'Executed', 'Modified', 'Changed']

test('denylist: no past-tense execution-claim language anywhere in the journey copy', () => {
  const allModuleStrings = flattenStrings({
    EXPOSURE_REVIEW_START,
    EXPOSURE_REVIEW_CONNECT,
    DISCOVERY_STEPS,
    DISCOVERY_SAMPLE_LABEL,
    DISCOVERY_COMPLETE_HEADLINE,
    DISCOVERY_COMPLETE_SUBHEADLINE,
    EXPOSURE_REPORT_TRUST_STATEMENT,
    CONVERSION_STAGES,
  })
  for (const str of allModuleStrings) {
    for (const banned of EXECUTION_DENYLIST) {
      // Allow negated framing like "No licences are modified." / "No
      // settings are changed." — only forbid the word appearing without a
      // preceding "No"/"not" negation context within the same string.
      if (/no\s+\w*\s*(modified|changed|executed|removed|disabled)/i.test(str)) continue
      assert.ok(!str.includes(banned), `found banned word "${banned}" in: "${str}"`)
    }
  }
})

test('no licence modification claims — only discovery/review/no-modification framing', () => {
  const allStrings = flattenStrings({
    EXPOSURE_REVIEW_START,
    EXPOSURE_REVIEW_CONNECT,
    EXPOSURE_REPORT_TRUST_STATEMENT,
  }).join(' ').toLowerCase()
  assert.ok(!allStrings.includes('licences were modified'))
  assert.ok(!allStrings.includes('licence changes were made'))
  assert.ok(allStrings.includes('no licences are modified') || allStrings.includes('no licence changes'))
})

// ─── 10. Real OAuth is delegated to the backend, never to client secrets ───
//
// Program 10 originally locked this page to a simulated setTimeout state
// machine with no real OAuth. Program 11 replaces that simulation with a
// real connect flow — but the contract this test protects still holds: the
// browser must never hold a client secret or call Microsoft's identity
// endpoints directly. All real OAuth (authorization URL generation, token
// exchange) happens server-side in api-server's m365-exposure-review-service
// via MicrosoftOAuthService; this page only calls Certen's own API and
// redirects the user's browser to a URL the backend returned.

test('Connect step implementation never embeds a Microsoft client secret or MSAL browser SDK', () => {
  const pageSource = readPage('ExposureReviewConnect.tsx')
  assert.ok(!pageSource.toLowerCase().includes('client_secret'))
  assert.ok(!pageSource.toLowerCase().includes('clientsecret'))
  assert.ok(!pageSource.includes('@azure/msal'))
  assert.ok(!pageSource.includes('msal-'))
  // Must call Certen's own backend API, not Microsoft's endpoints directly.
  assert.ok(!pageSource.includes("fetch('https://login.microsoftonline.com"))
  assert.ok(!pageSource.includes('fetch("https://login.microsoftonline.com'))
  assert.ok(pageSource.includes('exposure-review-client'))
})
