# Program 2 Technology Management Acceptance Audit

Audit date: 2026-07-05

## Executive question

Which technology assets, contracts, renewals, owners, overlaps, and risks require management action now?

## Routes audited

| Route | Surface | DEMO status | LIVE_UNCONNECTED status | Evidence Pack status |
|---|---|---|---|---|
| `/technology-portfolio` | Technology Management | PASS — coherent governed assets, owners, renewals, duplicate capability, high-risk unmanaged assets, rationalisation opportunity, and management decisions. | PASS — no demo assets, contracts, renewals, owners, overlaps, recommendations, savings, or outcomes are rendered without connected evidence. | PASS — inline asset detail evidence packs are COMPLETE or honestly PARTIAL. |
| `/technology-portfolio?tab=renewals` | Renewal Risk section | PASS — renewal examples include RENEW, OPTIMISE, and BLOCKED. | PASS — no renewal rows are invented. | PARTIAL shown when renewal/usage/owner evidence is missing. |
| `/technology-portfolio?tab=ownership` | Governed Assets / Missing Owner | PASS — owned and unowned assets are both represented. | PASS — empty state is neutral. | PARTIAL/BLOCKED for missing owner evidence. |
| `/technology-portfolio?tab=contracts` | Contract / renewal basis | PASS — contract and renewal basis is visible in asset detail. | PASS — contract evidence unavailable until connected sources exist. | PARTIAL when contract or renewal basis is required and absent. |

## Screenshots captured

Stored in `docs/program-2-technology-management-acceptance-audit/screenshots/`:

- `technology-management-demo.svg`
- `technology-management-live-unconnected.svg`
- `asset-detail-demo.svg`
- `asset-detail-live-unconnected.svg`
- `renewal-duplicate-overlap-demo.svg`
- `evidence-proof-pack-demo.svg`
- `evidence-proof-pack-live-unconnected.svg`

## Issues found

1. Page framing used “Technology Portfolio” rather than the executive-facing “Technology Management” surface language.
2. DEMO data was too thin for Program 2 acceptance: it did not cover enough owner, renewal, duplicate capability, underuse, unmanaged risk, or decision scenarios.
3. LIVE_UNCONNECTED fetched portfolio data even when the workspace had no connected evidence source and did not explicitly document the no-demo boundary.
4. Evidence Pack completeness was not specific to Program 2 management evidence requirements.
5. The decision model was implicit and did not guarantee REVIEW/BLOCKED when evidence was missing.

## Fixes made

- Reframed the page as Technology Management and placed the executive question at the top.
- Expanded DEMO data with owned/unowned assets, upcoming renewals, duplicate collaboration capability, high-cost underused assets, missing owner/business justification, and KEEP/RENEW/OPTIMISE/CONSOLIDATE/REVIEW/BLOCKED decisions.
- Added mode-safe KPI calculation for total governed assets, missing owner, renewals inside 90 days, duplicate capabilities, spend under review, rationalisation opportunity, high-risk unmanaged assets, and evidence completeness rate.
- Added Program 2 Evidence Pack completeness logic with conditional renewal, usage, risk/overlap, and outcome/protection requirements.
- Added a Technology Management decision model and inference so missing owner or missing evidence produces REVIEW/BLOCKED instead of fake confidence.
- Added inline asset detail Evidence Pack / Proof Pack panels so incompleteness is visible rather than hidden behind a link.
- Added tests for DEMO coherence, LIVE_UNCONNECTED no-demo boundaries, evidence COMPLETE/PARTIAL, decision inference, and KPI mode safety.

## Remaining risks

- Screenshots are deterministic SVG audit captures because the container has no browser binary for true pixel capture.
- Full browser walkthrough should be repeated in CI or a workstation with Playwright/Chromium before an executive demo.
- Program 2 is scoped to the existing Technology Management route; no new Program 3+ scope was added.

## Tests run

- `pnpm --filter @workspace/control-plane run test -- program2-technology-management technology-portfolio`
- `pnpm --filter @workspace/control-plane run typecheck`
- `pnpm --filter @workspace/control-plane run build`

## Final verdict

**PARTIAL** — Source-level acceptance criteria, mode boundaries, evidence completeness, decision model, audit documentation, and build checks pass. Market-ready browser certification remains pending because true browser screenshots cannot be captured in this container.
