// Phase A — Workflow Hardening Sprint. Workstream 3 output.
//
// Structured record of the canonical, customer-facing terms locked for the
// Certen website + acquisition journey, where each is used, and any
// conflicts found/fixed during this sprint. Internal/legacy variable, file,
// and component names (e.g. the TechnologyPortfolio.tsx page component, the
// /technology-portfolio route, the Sidebar's "Technology Portfolio" nav
// label) are explicitly OUT OF SCOPE for renaming — this sprint only
// corrects customer-facing display copy in the public website + Exposure
// Review journey, per the Phase A spec. Internal platform nav/page naming
// is pre-existing, load-bearing surface (referenced by ~15 existing tests)
// and is documented here as known debt, not touched.

export type TerminologyConflictStatus = 'NONE_FOUND' | 'FIXED' | 'DOCUMENTED_DEBT'

export interface CanonicalTermUsage {
  term: string
  /** Files/components where this canonical term is used in customer-facing copy. */
  usedIn: string[]
  conflictStatus: TerminologyConflictStatus
  note: string
}

export const CANONICAL_TERMS: CanonicalTermUsage[] = [
  {
    term: 'Exposure Review',
    usedIn: [
      'src/pages/LandingPage.tsx (hero CTA, header "Get started")',
      'src/pages/ExposureReviewStart.tsx',
      'src/lib/website/exposureReviewJourney.ts',
      'src/lib/website/defaultLandingPage.ts',
    ],
    conflictStatus: 'NONE_FOUND',
    note:
      'Used consistently as "Exposure Review" / "Run Free Exposure Review" across the website and journey. The internal /executive/exposure-report page is named "Exposure Report" (a noun, the deliverable) rather than "Exposure Review" (the verb/process) — distinct enough that no customer-facing confusion was found between the two; see Navigation Findings in the audit report.',
  },
  {
    term: 'Executive Review',
    usedIn: [
      'src/pages/LandingPage.tsx (hero secondary CTA, footer, Section 8 CTA)',
      'src/pages/ExecutiveReview.tsx',
      'src/pages/ExposureReviewReport.tsx (Book Executive Review CTA)',
      'src/lib/website/exposureReviewJourney.ts',
      'src/lib/website/defaultLandingPage.ts',
    ],
    conflictStatus: 'FIXED',
    note:
      'The landing page footer\'s "Book Executive Review" link and Section 8\'s "Book Executive Review" button both pointed at the #economic-control-chain in-page anchor instead of the real /executive-review route — the CTA label promised a booking flow but did not lead to one. Fixed: both now link to /executive-review.',
  },
  {
    term: 'Technology Authority',
    usedIn: [
      'src/lib/website/exposureReviewJourney.ts (ReviewTopic options on the Executive Review booking form)',
    ],
    conflictStatus: 'FIXED',
    note:
      'The Executive Review booking form\'s review-topic options used the legacy pre-Program-4 name "Technology Portfolio" instead of "Technology Authority". Fixed in exposureReviewJourney.ts\'s ReviewTopic type and REVIEW_TOPICS constant. NOTE: "Technology Portfolio" remains, by design, as the internal platform page name (src/pages/TechnologyPortfolio.tsx, the /technology-portfolio route, and the Sidebar nav label) — that is pre-existing internal/platform naming asserted by ~15 existing tests and is out of surgical-fix scope for this sprint (file/export renames were explicitly excluded). This is documented debt, not a customer-facing conflict, since a prospect in the public Exposure Review journey never sees the internal page name.',
  },
  {
    term: 'Economic Control Chain',
    usedIn: [
      'src/pages/LandingPage.tsx (Section 7 explainer, anchor id)',
      'src/pages/ExposureReviewConversion.tsx (Stage 2)',
      'src/lib/website/defaultLandingPage.ts',
      'src/lib/website/exposureReviewJourney.ts',
    ],
    conflictStatus: 'DOCUMENTED_DEBT',
    note:
      'Used consistently as "Economic Control Chain" in all customer-facing website/journey copy — no conflicts found there. One internal, non-customer-facing usage of the legacy "Economic Graph" label remains in src/pages/PilotWorkspace.tsx ("Economic Graph Health") and is asserted by src/lib/pilot-workspace.test.tsx. PilotWorkspace is an authenticated internal demo page, not part of the public acquisition journey, so this is left as documented debt rather than a surgical fix in this sprint (renaming it would touch internal test fixtures outside the Phase A surgical-fix scope).',
  },
  {
    term: 'Outcome Finance',
    usedIn: ['src/pages/executive/OutcomeFinance.tsx', 'src/components/layout/Sidebar.tsx (Intelligence group)'],
    conflictStatus: 'NONE_FOUND',
    note: 'Used consistently; not part of customer-facing public copy (internal authenticated page only).',
  },
  {
    term: 'Outcome Protection',
    usedIn: ['src/pages/OutcomeProtectionView.tsx', 'src/components/layout/Sidebar.tsx (Protected Governance group)'],
    conflictStatus: 'NONE_FOUND',
    note: 'Used consistently; internal authenticated page only.',
  },
  {
    term: 'Executive Command Center',
    usedIn: ['src/pages/CommandView.tsx (registered as "Overview" in Sidebar/App.tsx)'],
    conflictStatus: 'NONE_FOUND',
    note:
      'CommandView.tsx is internally referred to in comments/tests as the "Executive Command Center" orchestrator; its Sidebar nav label is "Overview" and its route is /overview. No customer-facing conflict found — this label is not exposed in the public website/journey at all.',
  },
  {
    term: 'Governed Answers',
    usedIn: ['src/pages/LandingPage.tsx (Section 6 headline)', 'src/lib/website/defaultLandingPage.ts'],
    conflictStatus: 'NONE_FOUND',
    note: 'Used consistently as the Section 6 headline concept; no stray "AI Assistant"/"Chatbot" framing found nearby.',
  },
]

// Denylist of legacy/conflicting terms that must not appear as
// customer-facing product terminology in the public website + journey
// surfaces (file/variable names and internal-only platform pages are out of
// scope — see notes above).
export const TERMINOLOGY_DENYLIST = ['Technology Portfolio', 'Economic Graph', 'Assessment', 'Scan', 'Review Report'] as const

export function getTerminologyAudit(): CanonicalTermUsage[] {
  return CANONICAL_TERMS
}
