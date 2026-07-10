# Program 6A — Coverage Preservation Audit

Commit `6267a68` rewrote `CommandView.tsx` into the Executive Command Center
orchestrator (Program 6) and, in doing so, removed several legacy widgets
that other test files had assertions against. That commit adapted those 17
test files by simply dropping the dead assertions (with an inline note), but
did not check whether the underlying feature still exists elsewhere in the
product and, if so, re-point coverage at its real owning page.

This audit (Program 6A) reviews each of the 17 affected test files,
determines whether the removed feature/widget still exists anywhere in the
live product, and either relocates the test assertion to the real owning
page/component, or confirms the prior disposition as deliberate, documented
product debt. No product UI/page code was changed — only test files were
modified (re-pointing `fs.readFileSync` targets and assertions to existing
pages where features were found to still exist) and this audit doc was
added.

| Test File | Feature/Widget Removed From CommandView | Still Exists Elsewhere? | Disposition |
|---|---|---|---|
| `benchmark-intelligence.test.tsx` | "Benchmark Gaps" table / "Potential Value:" copy | Yes — `pages/BenchmarkIntelligenceView.tsx` renders a "Benchmark Gaps" table (`data-testid='benchmark-table'`) | Relocated: assertion now checks `BenchmarkIntelligenceView.tsx` for "Benchmark Gaps" instead of `CommandView.tsx` |
| `contract-intelligence.test.tsx` | "Contract Risk" table / "contracts require review" copy | Yes — `pages/ContractIntelligenceView.tsx` renders a "Contract Risk" table (`data-testid='contract-table'`) | Relocated: assertion now checks `ContractIntelligenceView.tsx` for "Contract Risk" instead of `CommandView.tsx` |
| `demo-runtime-realism.test.tsx` | "What Changed" runtime activity section (`data-testid='what-changed'`, `useRuntimeEvents`) and "No executive priorities available." / "No significant changes in the last 24 hours." empty-state copy | No — CommandView's six new orchestrator sections do not include a "What Changed" activity section; the demo runtime activity data itself is still exercised via other tests (`live-runtime-events.test.tsx`, `demo-runtime-realism.test.tsx`'s own activity-stream assertions), just not rendered on CommandView | Documented as product debt (comment already present in test, reaffirmed by this audit) |
| `vendor-intelligence.test.tsx` | "Vendor Changes Requiring Review" / "potentially affected spend" copy | Yes, in substance — `pages/VendorIntelligenceView.tsx` has a "Vendor Changes Detected" / "Affected Spend" summary (`data-testid='vendor-intelligence-summary'`), different copy, same concept | Relocated: assertion now checks `VendorIntelligenceView.tsx` for "Vendor Changes Detected" / "Affected Spend" |
| `contract-intelligence.test.tsx` | (see row above) | — | — |
| `executive-priorities.test.tsx` | "Top 5 Executive Priorities" / "executive-priorities-command" widget | Yes — `pages/ExecutivePrioritiesView.tsx` already has its own test (in the same file) asserting "Top 5 Monthly Savings", "Top 5 Annual Savings", "Top Priorities", etc. against the real owning page | Relocated (no-op edit needed): comment updated to point at the existing owning-page test in the same file; no duplicate assertion added |
| `executive-value.test.tsx` | Direct link `/executive-value` from CommandView | No — CommandView's Executive Value Snapshot section now reuses the same underlying value-metric computation instead of deep-linking to `/executive-value`; the link still exists from `OutcomeLedgerView`, `EvidencePacksView`, `M365OnboardingView` (all asserted elsewhere in the same test) | Documented as product debt (comment already present in test, reaffirmed by this audit) |
| `live-runtime-events.test.tsx` | "What Changed" empty-state ("No significant changes in the last 24 hours.") rendered via CommandView, plus `useRuntimeEvents` import in CommandView | No — same as `demo-runtime-realism.test.tsx` above; the `RuntimeActivityList` foundation component itself is unaffected and still tested directly | Documented as product debt (comment already present in test, reaffirmed by this audit) |
| `m365-economic-hardening-ui.test.tsx` | CommandView grouping M365 opportunities by production-readiness step (`READY_FOR_APPROVAL`, `REVIEW_REQUIRED`, `BLOCKED`, `SHOW_OPPORTUNITY`) | No — `pages/M365OnboardingView.tsx` and `pages/connectors-m365.tsx` have related but distinct readiness vocabularies ("Ready for approval" / "Needs hardening" / "Not ready" for onboarding checks), not opportunity-grouping by production-readiness step | Documented as product debt (comment already present in test, reaffirmed by this audit) |
| `m365-onboarding-ui.test.tsx` | "Complete M365 onboarding" priority action on CommandView | No — CommandView's Recommended Next Actions now defaults to a generic "Connect Microsoft 365" action, not an onboarding-progress-aware "Complete M365 onboarding" message; `ConnectorHub.tsx`'s "Continue onboarding" CTA is a related but separate surface (already covered by this same test file) | Documented as product debt (comment already present in test, reaffirmed by this audit) |
| `opportunities-page.test.tsx` | "Top Opportunities" / "top-opportunities" widget linking to `/opportunities` | Yes, in substance — `pages/OpportunitiesView.tsx` ("Ranked Opportunity List") is the owning page, and the `/opportunities` route remains registered in `App.tsx` independently of CommandView | Relocated: assertion now checks `App.tsx` for the `/opportunities` route and `OpportunitiesView.tsx` for "Ranked Opportunity List" |
| `opportunity-factory-ui.test.tsx` | "Opportunity Factory Summary" widget (`data-testid='opportunity-factory-summary'`) and `useCommandData.ts` usage | No — `useCommandData.ts` and its "Opportunity Factory Summary" posture data (`lib/liveNormalizers.ts`) still exist as orphaned data-layer code, but are no longer imported/rendered by any page | Documented as product debt (comment already present in test, reaffirmed by this audit) |
| `outcome-proof-authority.test.tsx` | "Outcome Proof Summary" widget (`data-testid='outcome-proof-summary'`) | Yes, in substance — `pages/OutcomeLedgerView.tsx` (routed at `/outcomes`) has its own "Outcome Proof Authority" section with the full projected/approved/executed/verified/retained/protected ledger | Relocated: assertion now checks `OutcomeLedgerView.tsx` for "Outcome Proof Authority" |
| `platform-event-authority.test.tsx` | CommandView importing/rendering `RuntimeActivityList` | No — same root cause as `demo-runtime-realism.test.tsx`/`live-runtime-events.test.tsx` ("What Changed" section removed); `RuntimeActivityList` itself (backed by `PlatformEventTimeline`) is unaffected and used elsewhere | Documented as product debt (comment already present in test, reaffirmed by this audit) |
| `recommendation-approval-bridge.test.tsx` | Literal "Approval pending" disabled button (old CommandView action-queue UI) | No — neither the Program 6 Executive Command Center nor the prior Executive Brief layout retains an action-queue UI; the equivalent flow lives in `pages/recommendations.tsx` via "Awaiting approval" state (already asserted in this same test) | Documented as product debt (comment already present in test, reaffirmed by this audit) |
| `renewals-page.test.tsx` | "Upcoming Renewals Requiring Action" / "renewal-priority-actions" widget linking to `/renewals` | Yes, in substance — `pages/RenewalsView.tsx` ("Upcoming Renewals" summary card) is the owning page, and the `/renewals` route remains registered in `App.tsx` (now via redirect to `/technology-portfolio?tab=renewals`) | Relocated: assertion now checks `App.tsx` for the `/renewals` route and `RenewalsView.tsx` for "Upcoming Renewals" |
| `trust-accountability.test.tsx` | "trust-priority-action" widget ("trust tasks overdue" / "blocked value awaiting ownership") | Yes, in substance — `pages/DataTrustView.tsx` has an "Overdue" card with "blocked value overdue" copy, different wording, same concept | Relocated: assertion now checks `DataTrustView.tsx` for "Overdue" / "blocked value overdue" |
| `utilization-intelligence.test.tsx` | "Utilization Waste" table / "utilization-waste-narrative" | Yes — `pages/UtilizationIntelligenceView.tsx` renders a "Utilization Waste" table (`data-testid='utilization-table'`) | Relocated: assertion now checks `UtilizationIntelligenceView.tsx` for "Utilization Waste" instead of `CommandView.tsx` |

## Summary

- **Relocated to a real owning page/component (8 files):** `benchmark-intelligence.test.tsx`,
  `contract-intelligence.test.tsx`, `vendor-intelligence.test.tsx`,
  `executive-priorities.test.tsx`, `opportunities-page.test.tsx`,
  `outcome-proof-authority.test.tsx`, `renewals-page.test.tsx`,
  `trust-accountability.test.tsx`, `utilization-intelligence.test.tsx`
  (9 files — see table for exact list).
- **Documented as deliberate, acknowledged product debt (8 files):**
  `demo-runtime-realism.test.tsx`, `executive-value.test.tsx`,
  `live-runtime-events.test.tsx`, `m365-economic-hardening-ui.test.tsx`,
  `m365-onboarding-ui.test.tsx`, `opportunity-factory-ui.test.tsx`,
  `platform-event-authority.test.tsx`, `recommendation-approval-bridge.test.tsx`.
- **No product UI/page code was changed.** All edits were confined to test
  files (re-pointing `fs.readFileSync` targets at already-existing pages and
  asserting against their already-rendered text) and this audit document.
