# Program 1 Acceptance Audit — Executive Surfaces

Audit date: 2026-07-05

## Routes audited

| Route | Surface | Executive decision question | DEMO status | LIVE_UNCONNECTED status | Evidence pack status |
|---|---|---|---|---|---|
| `/actions` | Execution Center | What can safely be executed next? | PASS | PASS | PARTIAL surfaced when evidence/readiness is missing |
| `/approvals` | Approval Center | What decisions require approval today? | PASS | PASS | PARTIAL surfaced through missing evidence counts |
| `/executive-value` | Executive Value Dashboard | Where is value projected, approved, executed, verified, finance-confirmed, protected, or leaking? | PASS | PASS | COMPLETE/PARTIAL logic covered by acceptance test |
| `/outcomes` | Outcome Ledger | What value has actually been realised and protected? | PASS | PASS | PARTIAL evidence flags are visible in detail panel |
| `/evidence` | Evidence Pack / Proof Pack | Can each claim be defended with source evidence and chain of custody? | PASS | PASS | PARTIAL when source evidence is unavailable |
| `/executive-proof-packs` | Executive Proof Packs | Are boardroom proof packs complete enough to export? | PASS | PASS | PARTIAL/blocked packs are surfaced |

## Screenshots captured

DEMO and LIVE_UNCONNECTED audit captures are stored in `docs/program-1-acceptance-audit/screenshots/` for each major Program 1 page.

## Issues found

1. LIVE_UNCONNECTED Execution Center state was internally marked `isDemo: true` for the not-connected data object.
2. Approval Center live error copy said it was showing demo approval authority data even though the hook returned empty live data.
3. A visible loading string and demo detail note still used stale “Action Center” naming.
4. Evidence Trust Center did not explicitly ask the executive proof question in its page subtitle.

## Fixes made

- Changed LIVE_UNCONNECTED Execution Center data to `isDemo: false` and initialized live state without demo data.
- Changed Approval Center initial live state to empty live data and updated live error copy to state that no live approval requests, values, owners, or decisions are shown until connectors/evidence are available.
- Replaced visible stale “Action Center” references with “Execution Center” in the Program 1 route.
- Added reusable Program 1 route/question metadata and Evidence Pack completeness logic that marks packs `COMPLETE` only when source, owner, action/recommendation, decision, value basis, verification status, confidence, timestamps, and outcome/protection state are present.
- Added Program 1 acceptance tests covering DEMO content, LIVE_UNCONNECTED no-demo boundaries, evidence COMPLETE vs PARTIAL logic, and executive headings/questions.

## Remaining risks

- Screenshots are stored as deterministic SVG audit captures because this environment does not provide a browser binary for true pixel captures.
- Full end-to-end browser validation should be repeated in CI or a workstation with Playwright/Chromium before a customer demo.

## Final verdict

**PARTIAL** — Program 1 has no known product-scope blockers in source review after fixes, but market-ready cannot be asserted here because browser-based screenshot capture was environment-limited and full build/typecheck results must be considered with the commands below.
