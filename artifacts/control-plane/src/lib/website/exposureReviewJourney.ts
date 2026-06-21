// Static content/state model for the Program 10 M365 Exposure Review Journey.
//
// This is a content-only, testable module — no UI, no live platform data.
// React page components in src/pages/ExposureReview*.tsx,
// src/pages/ExecutiveReview.tsx import these constants/types so the
// copy/route wiring can be unit-tested without a rendering harness, following
// the same pattern established by defaultLandingPage.ts (Programs 9/9A/9B).
//
// The whole journey is pre-login/public — a deterministic, simulated
// click-through funnel (connect → discovery → report → booking →
// conversion). No real OAuth, no real network calls, no random data.

// ─── Route paths ─────────────────────────────────────────────────────────────

export const EXPOSURE_REVIEW_ROUTES = {
  start: '/exposure-review',
  connect: '/exposure-review/connect',
  discovery: '/exposure-review/discovery',
  report: '/exposure-review/report',
  executiveReview: '/executive-review',
  nextSteps: '/exposure-review/next-steps',
} as const

// ─── Part 1 — Exposure Review Start ─────────────────────────────────────────

export interface ExposureReviewStartContent {
  headline: string
  subheadline: string
  trustBanner: string[]
  primaryCta: string
  primaryCtaHref: string
}

export const EXPOSURE_REVIEW_START_TRUST_BANNER: string[] = [
  'Read-only access',
  'No licence changes',
  'No automated execution',
  'Discovery only',
  'Access revocable at any time',
]

export const EXPOSURE_REVIEW_START: ExposureReviewStartContent = {
  headline: 'Run a Free Microsoft 365 Exposure Review',
  subheadline:
    'Discover unused licences, ownership gaps, governance risks and value opportunities without making any changes to your tenant.',
  trustBanner: EXPOSURE_REVIEW_START_TRUST_BANNER,
  primaryCta: 'Connect Microsoft 365',
  primaryCtaHref: EXPOSURE_REVIEW_ROUTES.connect,
}

// ─── Part 2 — M365 Connection Step ──────────────────────────────────────────

export type ConnectState = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED'

export const CONNECT_SIMULATED_DELAY_MS = 1800

export const REQUESTED_PERMISSIONS: string[] = [
  'User.Read.All',
  'Directory.Read.All',
  'Reports.Read.All',
  'AuditLog.Read.All',
]

export const CONNECT_SECURITY_STATEMENT: string[] = [
  'Certen performs read-only discovery during the Exposure Review.',
  'No actions are executed.',
  'No licences are modified.',
  'No settings are changed.',
]

export interface ExposureReviewConnectContent {
  permissions: string[]
  securityStatement: string[]
  connectCta: string
  beginDiscoveryCta: string
  beginDiscoveryHref: string
}

export const EXPOSURE_REVIEW_CONNECT: ExposureReviewConnectContent = {
  permissions: REQUESTED_PERMISSIONS,
  securityStatement: CONNECT_SECURITY_STATEMENT,
  connectCta: 'Connect Microsoft 365',
  beginDiscoveryCta: 'Begin Discovery',
  beginDiscoveryHref: EXPOSURE_REVIEW_ROUTES.discovery,
}

// ─── Part 3 — Discovery Experience ──────────────────────────────────────────

export type DiscoveryStepStatus = 'Queued' | 'Running' | 'Completed'

export interface DiscoveryStepDefinition {
  step: number
  label: string
}

export const DISCOVERY_STEPS: DiscoveryStepDefinition[] = [
  { step: 1, label: 'Identities' },
  { step: 2, label: 'Licences' },
  { step: 3, label: 'Applications' },
  { step: 4, label: 'Owners' },
  { step: 5, label: 'Governance Signals' },
  { step: 6, label: 'Value Opportunities' },
]

// Each step runs for this fixed duration before advancing to the next —
// deterministic and reproducible, not randomised/live telemetry.
export const DISCOVERY_STEP_DURATION_MS = 900

export const DISCOVERY_SAMPLE_LABEL = 'Sample discovery experience.'

export const DISCOVERY_COMPLETE_HEADLINE = 'Discovery Complete'
export const DISCOVERY_COMPLETE_SUBHEADLINE = 'Exposure Report Ready'

export const DISCOVERY_VIEW_REPORT_CTA = 'View Exposure Report'
export const DISCOVERY_VIEW_REPORT_HREF = EXPOSURE_REVIEW_ROUTES.report

// ─── Part 4 — Exposure Report Experience ────────────────────────────────────
// Reuses defaultExposureReport.ts directly — no parallel report model.

export const EXPOSURE_REPORT_TRUST_STATEMENT: string[] = [
  'Report generated from read-only discovery.',
  'Actions have not been executed.',
]

export const EXPOSURE_REPORT_BOOK_REVIEW_CTA = 'Book Executive Review'
export const EXPOSURE_REPORT_BOOK_REVIEW_HREF = EXPOSURE_REVIEW_ROUTES.executiveReview

export const EXPOSURE_REPORT_EXPLORE_PLATFORM_CTA = 'Explore Certen Platform'
export const EXPOSURE_REPORT_EXPLORE_PLATFORM_HREF = EXPOSURE_REVIEW_ROUTES.nextSteps

// ─── Part 5 — Executive Review Booking ──────────────────────────────────────

export type PreferredTimeframe = 'Immediately' | 'This Week' | 'Next Week' | 'This Month'

export const PREFERRED_TIMEFRAMES: PreferredTimeframe[] = ['Immediately', 'This Week', 'Next Week', 'This Month']

// Workflow hardening fix: "Technology Portfolio" was the pre-Program-4
// legacy name; customer-facing copy must use the canonical "Technology
// Authority" term everywhere, including this public booking form.
export type ReviewTopic = 'M365' | 'AI' | 'Cloud' | 'ITAM' | 'Technology Authority'

export const REVIEW_TOPICS: ReviewTopic[] = ['M365', 'AI', 'Cloud', 'ITAM', 'Technology Authority']

export interface ExecutiveReviewFormState {
  name: string
  company: string
  email: string
  role: string
  preferredTimeframe: PreferredTimeframe | ''
  topics: ReviewTopic[]
}

export const EXECUTIVE_REVIEW_EMPTY_FORM: ExecutiveReviewFormState = {
  name: '',
  company: '',
  email: '',
  role: '',
  preferredTimeframe: '',
  topics: [],
}

export const EXECUTIVE_REVIEW_SUBMIT_CTA = 'Submit Request'
export const EXECUTIVE_REVIEW_CONFIRMATION_HEADLINE = 'Executive Review Request Submitted'

// ─── Part 6 — Conversion Bridge ─────────────────────────────────────────────

export interface ConversionStage {
  stage: number
  title: string
  description: string
}

export const CONVERSION_STAGES: ConversionStage[] = [
  {
    stage: 1,
    title: 'Technology Authority',
    description: 'Establish a governed record of what technology is owned, by whom, and at what cost.',
  },
  {
    stage: 2,
    title: 'Economic Control Chain',
    description: 'Move findings through discovery, ownership, analysis, approval, execution, verification and protection.',
  },
  {
    stage: 3,
    title: 'Outcome Finance',
    description: 'Reconcile recommended and verified value against finance-confirmed figures.',
  },
  {
    stage: 4,
    title: 'Outcome Protection',
    description: 'Monitor verified outcomes over time and prevent savings from drifting back to exposure.',
  },
  {
    stage: 5,
    title: 'Executive Command Center',
    description: 'Give executives a single governed view of exposure, value delivered and what requires attention.',
  },
]

export const CONVERSION_INTRO =
  'This Exposure Report is one technology domain, captured once. Certen extends this discovery into a continuous, governed economic control system.'
