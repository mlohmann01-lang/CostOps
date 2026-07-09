// Phase A — Workflow Hardening Sprint. Workstream 1 output.
//
// Structured audit record of every transition in the public Certen
// acquisition journey: Website -> Exposure Review -> Discovery -> Exposure
// Report -> Executive Review -> Platform. This file documents the FINAL,
// POST-FIX state of the journey (i.e. after the surgical fixes made during
// this sprint were applied) — not the pre-fix problems. Where a transition
// was changed during this sprint, `previousStatus`/`previousNote` capture
// what was found and fixed, for the audit narrative in
// WORKFLOW_HARDENING_AUDIT.md.
//
// This is a content-only, testable data module — no UI, no live platform
// data — following the same pattern as exposureReviewJourney.ts and
// defaultLandingPage.ts.

export type JourneyAuditStatus = 'PASS' | 'WARNING' | 'FAIL'

export interface JourneyTransition {
  id: string
  from: string
  to: string
  /** Route path of the destination, if it is an in-app route. */
  toRoute?: string
  status: JourneyAuditStatus
  note: string
  previousStatus?: JourneyAuditStatus
  previousNote?: string
}

export const JOURNEY_TRANSITIONS: JourneyTransition[] = [
  {
    id: 'welcome-to-exposure-review',
    from: 'welcome',
    to: 'exposure-review',
    toRoute: '/exposure-review',
    status: 'PASS',
    note:
      'Hero primary CTA, the Exposure Report section CTA, and the header "Get started" button all link to /exposure-review. Clear purpose, clear CTA.',
  },
  {
    id: 'exposure-review-to-connect',
    from: 'exposure-review',
    to: 'connect',
    toRoute: '/exposure-review/connect',
    status: 'PASS',
    note:
      'Start page has a single clear forward CTA ("Connect Microsoft 365") and a back link to /welcome ("← Certen"). No dead end.',
  },
  {
    id: 'connect-to-discovery',
    from: 'connect',
    to: 'discovery',
    toRoute: '/exposure-review/discovery',
    status: 'PASS',
    note:
      'Connect step gates the "Begin Discovery" forward link behind the simulated CONNECTED state, and provides a back link to /exposure-review. No dead end; no browser-back dependency.',
  },
  {
    id: 'discovery-to-report',
    from: 'discovery',
    to: 'report',
    toRoute: '/exposure-review/report',
    status: 'PASS',
    note:
      'Discovery page reveals "View Exposure Report" once all 6 steps complete, and provides a back link to /exposure-review/connect. No dead end.',
  },
  {
    id: 'report-to-executive-review',
    from: 'report',
    to: 'executive-review',
    toRoute: '/executive-review',
    status: 'PASS',
    note:
      'Report page’s primary CTA "Book Executive Review" links to /executive-review; back link to /exposure-review/discovery present.',
  },
  {
    id: 'report-to-next-steps',
    from: 'report',
    to: 'next-steps',
    toRoute: '/exposure-review/next-steps',
    status: 'PASS',
    note:
      'Report page’s secondary CTA "Explore Certen Platform" links to /exposure-review/next-steps, giving prospects who are not ready to book a review a non-dead-end second path.',
  },
  {
    id: 'executive-review-to-end',
    from: 'executive-review',
    to: '[end]',
    status: 'PASS',
    previousStatus: 'FAIL',
    previousNote:
      'The post-submission confirmation state had no forward link of any kind — a true dead end after a prospect completed the booking form. Only the page’s top "← Certen" back link remained.',
    note:
      'Fixed: confirmation state now also includes a "See what happens next" link to /exposure-review/next-steps, in addition to the existing back link to /exposure-review/report at the top of the page. No remaining dead end.',
  },
  {
    id: 'next-steps-to-end',
    from: 'next-steps',
    to: '[end]',
    status: 'PASS',
    note:
      'Conversion bridge page explains how the Exposure Report expands into the platform (5 stages) and ends with an explicit "Back to Certen" link to /welcome, plus a back link to /exposure-review/report at the top. Per Program 10 scope, this page intentionally does not deep-link into authenticated platform pages (no live session exists for an anonymous prospect) — that is correct, not a gap.',
  },
]

export function getJourneyAudit(): JourneyTransition[] {
  return JOURNEY_TRANSITIONS
}
