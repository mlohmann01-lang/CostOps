# Phase A — Workflow Hardening Sprint Audit

This audit covers the complete Certen acquisition and platform journey
(Website -> Exposure Review -> Discovery -> Exposure Report -> Executive
Review -> Platform), per the Phase A spec. It is a hardening pass only — no
new pages, authorities, dashboards, workflows, navigation groups, or product
modules were added. Structured supporting data lives in
`src/lib/website/journeyAudit.ts` and `src/lib/website/terminologyAudit.ts`,
and is exercised by `src/lib/website/workflowHardeningAudit.test.ts`.

Findings are classified P0 (broken/dead-end/contradiction, must-fix), P1
(inconsistency worth fixing now), or P2 (minor/cosmetic, may be left as
documented debt).

---

## Journey Findings

Reviewed all 7 routes: `/welcome`, `/exposure-review`, `/exposure-review/connect`,
`/exposure-review/discovery`, `/exposure-review/report`, `/executive-review`,
`/exposure-review/next-steps`.

- **P0 — FIXED.** `/executive-review`'s post-submission confirmation state had
  no forward link at all — a true dead end for a prospect who had just
  completed the booking form. The only navigational element left on the page
  was the top "← Certen" back link to `/exposure-review/report`. Fixed by
  adding a "See what happens next" link to `/exposure-review/next-steps` in
  the confirmation state (`src/pages/ExecutiveReview.tsx`).
- **PASS (no fix needed).** All 6 other pages already had a clear forward CTA
  and a clear back link at the top of the page ("← Certen"), consistent with
  the existing styling established by Program 10. No browser-back dependency
  was found anywhere in the journey — every forward step uses an explicit
  in-page `<a href>`.
- **PASS (no fix needed).** `/exposure-review/next-steps` (the Conversion
  Bridge) intentionally ends the journey with an explicit "Back to Certen"
  link to `/welcome` rather than deep-linking into the authenticated
  platform — correct, since an anonymous prospect has no session. This is
  documented as expected behavior, not a gap.

Post-fix state is recorded transition-by-transition in `journeyAudit.ts`; all
8 transitions are now `PASS`. The single `previousStatus: 'FAIL'` entry
documents the Executive Review dead-end described above.

---

## Navigation Findings

- **P1 — FIXED.** The internal Exposure Report page (`/executive/exposure-report`,
  `src/pages/ExposureReport.tsx`, registered in `App.tsx` as
  `ExposureReportRoute`) was an orphan route: reachable only by typing the
  URL directly, with no link anywhere in `Sidebar.tsx` or any other internal
  page. Fixed by adding it to the Intelligence nav group in
  `src/components/layout/Sidebar.tsx`, alongside Authority Catalog, Economic
  Control Chain, and Outcome Finance, labelled "Exposure Report" (not
  "Exposure Review" — see Terminology Findings below for why that
  distinction matters).
- **P0 — FIXED.** The landing page footer's "Book Executive Review" link and
  Section 8's "Book Executive Review" button (`src/pages/LandingPage.tsx`,
  `src/lib/website/defaultLandingPage.ts`) both pointed at the
  `#economic-control-chain` in-page anchor instead of the real
  `/executive-review` route. This is a broken/misleading CTA: the label
  promises a booking flow, but clicking it scrolled to an unrelated section.
  Fixed: `PUBLIC_FOOTER.executiveReviewHref` now points to `/executive-review`,
  and a new `ExecutiveReviewContent.ctaHref` field (also `/executive-review`)
  drives the Section 8 button.
- **PASS (no fix needed).** Header nav (Program 9A), in-journey navigation
  (Connect -> Discovery -> Report -> Executive Review -> Next Steps), and the
  rest of platform Sidebar navigation were all verified intact — no other
  broken or missing links found. Authority Catalog, Economic Control Chain,
  Outcome Finance, Executive Review, Technology Authority (internal page name
  "Technology Portfolio" — see below), Outcome Protection, and Executive
  Command Center (`/overview`, internally CommandView.tsx) are all reachable
  from Sidebar as before; none of that existing reachability was broken by
  this sprint's changes.
- **Naming-confusion check, PASS (no fix needed).** The internal
  `/executive/exposure-report` ("Exposure Report" — a noun, a generated
  deliverable) and the public `/exposure-review` journey ("Exposure Review" —
  the verb/process a prospect runs) are named distinctly enough that no
  customer-facing confusion was found between them. The new Sidebar entry
  added above deliberately uses "Exposure Report" to preserve that
  distinction; a unit test (`workflowHardeningAudit.test.ts`) asserts the
  Sidebar never uses the literal label "Exposure Review".

---

## Terminology Findings

Canonical, locked terms: "Exposure Review", "Executive Review", "Technology
Authority", "Economic Control Chain", "Outcome Finance", "Outcome
Protection", "Executive Command Center", "Governed Answers". Full detail in
`terminologyAudit.ts`.

- **P1 — FIXED.** The `/executive-review` booking form's review-topic
  checkbox list (`ReviewTopic` type, `REVIEW_TOPICS` in
  `src/lib/website/exposureReviewJourney.ts`) used the legacy pre-Program-4
  name "Technology Portfolio" as a customer-facing option label. Fixed to
  "Technology Authority" in both the type and the constant (and the
  corresponding test assertion in `exposureReviewJourney.test.ts`).
- **P2 — DOCUMENTED DEBT, not fixed.** "Technology Portfolio" remains, by
  design, as the *internal platform* page name: `src/pages/TechnologyPortfolio.tsx`,
  the `/technology-portfolio` route, and the Sidebar nav label. This is
  deeply pre-existing internal naming, asserted directly by roughly 15
  existing test files (`benchmark-intelligence.test.tsx`,
  `contract-intelligence.test.tsx`, `utilization-intelligence.test.tsx`,
  `vendor-intelligence.test.tsx`, `renewals-page.test.tsx`,
  `ownership-intelligence.test.tsx`, `executive-ui-components.test.tsx`,
  `ai-economic-control-ui.test.tsx`, `nav-registry.ts`, and others). Renaming
  it is a file/export rename, which the Phase A spec explicitly puts out of
  scope ("renaming files/exports is out of scope, only fix display copy").
  Since this name is never shown to anonymous prospects in the public
  Exposure Review journey (only to authenticated internal platform users), it
  is not a customer-facing terminology conflict and is left as documented
  debt.
- **P2 — DOCUMENTED DEBT, not fixed.** One internal, non-customer-facing
  usage of the legacy "Economic Graph" label remains in
  `src/pages/PilotWorkspace.tsx` ("Economic Graph Health"), asserted by
  `src/lib/pilot-workspace.test.tsx`. PilotWorkspace is an authenticated
  internal demo page, not part of the public acquisition journey, so this is
  left as documented debt rather than a surgical fix touching internal test
  fixtures outside this sprint's scope.
- **PASS (no issues found).** No stray "Assessment", "Scan", or "Review
  Report" usages were found anywhere in the public website or Exposure
  Review journey customer-facing copy (`LandingPage.tsx`,
  `ExposureReview*.tsx`, `ExecutiveReview.tsx`, `exposureReviewJourney.ts`,
  `defaultLandingPage.ts`). "Economic Control Chain", "Outcome Finance",
  "Outcome Protection", "Executive Command Center", and "Governed Answers"
  are all used consistently with no conflicts in customer-facing surfaces.

---

## Trust Findings

Reviewed: Landing Page, Exposure Review (start), Connect Step, Discovery
Step, Exposure Report (`/exposure-review/report`).

- **PASS (no issues found).** All five trust-sensitive surfaces already carry
  appropriate, judiciously-chosen subsets of the locked trust language
  ("Read-only", "No changes made", "No automated execution", "Discovery
  only", "Access revocable"): the landing hero trust banner, the Exposure
  Review start page's 5-item trust banner, the Connect step's security
  statement ("No actions are executed.", "No licences are modified.", "No
  settings are changed."), the Discovery step's explicit "Sample discovery
  experience." label, and the Exposure Report's "Report generated from
  read-only discovery." / "Actions have not been executed." statement.
- No wording implying live execution, real tenant modifications, licence
  removal, or automated governance actions was found anywhere in the
  journey. This workstream required no fixes.

---

## CTA Findings

Locked motions: Primary "Run Free Exposure Review", Secondary "Book
Executive Review". The header's "Get started" nav button (Program 9A) is the
one explicitly carved-out exception, re-confirmed below.

- **P0 — FIXED.** See Navigation Findings above: "Book Executive Review" in
  the footer and Section 8 both linked to the wrong target
  (`#economic-control-chain` instead of `/executive-review`). This was as
  much a CTA-correctness bug as a navigation bug — the label and the
  destination disagreed. Fixed.
- **PASS (no issues found).** No stray "Try Now" / "Launch Review" / "Begin
  Assessment" or other competing CTA-styled button text was found anywhere
  in the journey or landing page.
- **Carve-out re-confirmed, intentional, documented.** "Get started" appears
  exactly once, as the header nav button's label
  (`PUBLIC_HEADER.getStartedLabel` in `defaultLandingPage.ts`), routed to
  `/exposure-review` per the Program 10 carve-out comment already in that
  file. It does not appear as a page-level CTA button anywhere else in the
  journey or landing page; verified by a precise regex/string test in
  `workflowHardeningAudit.test.ts` that distinguishes the header context from
  any other literal "Get started" usage.

---

## Empty State Findings

Reviewed: Authority Catalog, Technology Authority (internal page
`TechnologyPortfolio.tsx`), Outcome Finance, Outcome Protection, Executive
Command Center, Tenant Readiness, Live Tenant Readiness, Evidence Registry.

- **PASS (no issues found).** All eight pages already guard every
  potentially-undefined/null metric with an explicit `!== undefined` check or
  a `notAvailable`/`'Not available'` fallback (e.g.
  `AuthorityCatalog.tsx`, `OutcomeFinance.tsx`, `EvidenceRegistry.tsx`'s
  `val()`/`pct()` helpers). No raw `undefined`/`null`/stack-trace-like text
  was found rendered in any empty state, and no contradictory "0 of 0
  complete, action required" style phrasing was found. The MW-002/MW-003
  empty-state hardening from earlier sprints has not regressed — confirmed
  against the existing `terminology-consistency.test.ts` assertions, which
  still pass unchanged. This workstream required no fixes.

---

## Mobile Findings

Performed as a **static code review only** — no live browser/devtools
verification was performed; this should be confirmed visually in a real
browser as a follow-up.

- **P1 — FIXED.** Several fixed `gridTemplateColumns: 'repeat(N, 1fr)'` grids
  in `LandingPage.tsx` (Market Problem 3-card row, Uncover/Execute/Protect
  3-column row, Exposure Report secondary-metrics 4-column row, Questions
  2-column row, Governed Answers 2-column row, Economic Control Chain
  4-column row) and `ExposureReviewReport.tsx` (4-column metric row) had no
  responsive fallback. The codebase has no existing `@media` breakpoint
  infrastructure anywhere (confirmed: zero `@media` usages in any `.tsx`/`.css`
  file) — introducing real media queries would be new infrastructure, out of
  surgical-fix scope. Instead, applied the minimal, CSS-only fix consistent
  with the existing inline-style approach: changed each fixed
  `repeat(N, 1fr)` to `repeat(auto-fit, minmax(<min-card-width>px, 1fr))`,
  which collapses to fewer columns (down to one) on narrow viewports without
  introducing horizontal scroll, with no JS/markup changes required.
- **PASS (no fix needed).** The CTA button rows (hero, Exposure Report, the
  ExecutiveReview form) already use `flexWrap: 'wrap'` and were confirmed to
  remain visible/tappable at narrow widths by inspection. The
  ExecutiveReview booking form is already single-column
  (`flexDirection: 'column'`) and has no overflow risk.

---

## Visual Findings

Compared spacing, headers, card hierarchy, status chips, metric cards, and
CTA styling between the Program 10 pages (`/exposure-review/*`,
`/executive-review`) and the broader website (Programs 9/9A/9B) and the
Program 8 internal Exposure Report (`/executive/exposure-report`).

- **PASS (no issues found).** Border radius (12–16px range, consistently
  14px for cards), the shared `BORDER_DEFAULT`/`TEAL` color tokens, card
  background tokens (`var(--surface-card, rgba(255,255,255,0.03))`), and CTA
  button styling (padding, font-size, font-weight) are all already reused
  consistently across `LandingPage.tsx`, all `ExposureReview*.tsx` pages,
  `ExecutiveReview.tsx`, and the internal `ExposureReport.tsx`
  (`borderRadius: 14`/`12`, `var(--border-default)`,
  `var(--surface-card)`). No isolated/inconsistent design pattern was found
  between the website and the platform, or between Program 10 and earlier
  Program 9-series pages. This workstream required no fixes.

---

## Summary of Fixes Applied

| # | Workstream | Severity | Status | File(s) |
|---|---|---|---|---|
| 1 | Journey | P0 | FIXED | `src/pages/ExecutiveReview.tsx` (added forward link after booking confirmation) |
| 2 | Navigation | P1 | FIXED | `src/components/layout/Sidebar.tsx` (added orphaned `/executive/exposure-report` to Intelligence nav group) |
| 3 | Navigation / CTA | P0 | FIXED | `src/lib/website/defaultLandingPage.ts`, `src/pages/LandingPage.tsx` (footer + Section 8 "Book Executive Review" now route to `/executive-review` instead of `#economic-control-chain`) |
| 4 | Terminology | P1 | FIXED | `src/lib/website/exposureReviewJourney.ts`, `src/lib/website/exposureReviewJourney.test.ts` ("Technology Portfolio" -> "Technology Authority" in the Executive Review booking form's review topics) |
| 5 | Terminology | P2 | DOCUMENTED DEBT | "Technology Portfolio" remains as internal platform page/route/nav name (out of scope: file/export renames); "Economic Graph" remains in internal-only `PilotWorkspace.tsx` |
| 6 | Mobile | P1 | FIXED | `src/pages/LandingPage.tsx`, `src/pages/ExposureReviewReport.tsx` (fixed-column grids -> `repeat(auto-fit, minmax(...))`) |
| 7 | Empty States | — | NO ISSUES FOUND | n/a |
| 8 | Trust | — | NO ISSUES FOUND | n/a |
| 9 | Visual | — | NO ISSUES FOUND | n/a |

Files touched in this sprint:

- `src/lib/website/journeyAudit.ts` (new)
- `src/lib/website/terminologyAudit.ts` (new)
- `src/lib/website/workflowHardeningAudit.test.ts` (new)
- `artifacts/control-plane/WORKFLOW_HARDENING_AUDIT.md` (new, this file)
- `src/pages/ExecutiveReview.tsx` (forward-link fix)
- `src/components/layout/Sidebar.tsx` (orphan route fix)
- `src/lib/website/defaultLandingPage.ts` (broken CTA href fix + new `ctaHref` field)
- `src/pages/LandingPage.tsx` (Section 8 CTA wiring fix + responsive grid fixes)
- `src/lib/website/exposureReviewJourney.ts` (legacy term fix)
- `src/lib/website/exposureReviewJourney.test.ts` (assertion updated to match)
- `src/pages/ExposureReviewReport.tsx` (responsive grid fix)
- `scripts/run-control-plane-tests.mjs` (registered new test file)

## Verification

- `pnpm typecheck` — passes clean.
- `pnpm test` — 547 tests passing (526 baseline + 21 new in
  `workflowHardeningAudit.test.ts`), 0 failures.
- `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/control-plane build` —
  succeeds.

## Definition of Done

This sprint stops here. No new capability, no new authorities, no Program 11
work was started — only consistency, clarity, trust, navigation, and
conversion hardening of the existing Certen customer journey, exactly as
scoped.
