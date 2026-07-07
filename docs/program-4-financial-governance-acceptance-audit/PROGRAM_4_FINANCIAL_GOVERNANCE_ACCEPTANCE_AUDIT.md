# Program 4 Financial Governance Acceptance Audit

Audit date: 2026-07-06

## Executive question

Where is technology investment creating measurable business value—and where is value being lost?

## Routes audited

| Route | Surface | DEMO status | LIVE_UNCONNECTED status | Evidence Pack status |
|---|---|---|---|---|
| `/executive-value` | Financial Governance / Executive Value | PASS — coherent technology investment, finance-confirmed value, protected value, value leakage, value under review, investment decisions, and finance evidence scenarios. | PASS — no demo spend, savings, value, ROI, investment, confidence, finance decisions, or protected value are shown without connected financial evidence. | PASS — Finance Evidence Packs are COMPLETE or honestly PARTIAL inline. |
| `/financial-governance` | Financial Governance alias | PASS — renders the same authority surface for CFO/CIO review. | PASS — same live-unconnected boundary. | PASS — same Finance Evidence Pack completeness logic. |
| `/executive-value` protected/leakage panels | Protected Value / Value Leakage | PASS — protected value and leakage examples are visible and evidence-backed. | PASS — no protected value or leakage is invented. | PARTIAL when required financial evidence is missing. |

## Screenshots captured

Stored in `docs/program-4-financial-governance-acceptance-audit/screenshots/`:

- `financial-governance-demo.svg`
- `financial-governance-live-unconnected.svg`
- `value-governance-demo.svg`
- `value-governance-live-unconnected.svg`
- `investment-detail-demo.svg`
- `investment-detail-live-unconnected.svg`
- `evidence-pack-demo.svg`
- `evidence-pack-live-unconnected.svg`
- `protected-value-panel.svg`
- `value-leakage-panel.svg`

## Issues found

1. Existing Executive Value page answered value questions, but did not explicitly frame Program 4 as Financial Governance / Value Governance.
2. The page had a hard-coded Demo Mode chip and did not prominently state the Program 4 executive question.
3. Financial evidence completeness was not modeled as a Finance Evidence Pack gate.
4. Investment decisions were not deterministic across missing evidence, estimated value, finance-confirmed value, negative ROI, duplicate spend, under-performance, and growth opportunity.
5. LIVE_UNCONNECTED copy needed to explicitly prohibit synthetic finance, ROI, value, confidence, decisions, and protected value.

## Fixes made

- Reframed the surface as Financial Governance / Executive Value and displayed the Program 4 executive question.
- Added `/financial-governance` as an alias route for the same executive authority surface.
- Added realistic DEMO financial governance scenarios for SaaS consolidation, M365 optimisation, AI optimisation, cloud optimisation, renewal avoidance, duplicate capability removal, licence recovery, protected value, blocked value, estimated value, finance-confirmed value, and value leakage.
- Added Finance Evidence Pack completeness logic covering investment, financial, value, governance, and evidence requirements.
- Added deterministic investment decision inference for INVEST, EXPAND, KEEP, OPTIMISE, CONSOLIDATE, RETIRE, REVIEW, and BLOCKED.
- Added Financial Governance KPIs, Investment Decision detail panels, Protected Value, and Value Leakage panels.
- Added tests for DEMO coherence, LIVE_UNCONNECTED no-demo finance, evidence COMPLETE/PARTIAL, decision rules, KPI mode safety, and no demo leakage into live.

## Remaining risks

- Screenshots are deterministic SVG audit captures because the container has no browser binary for true pixel capture.
- Full browser walkthrough should be repeated in CI or a workstation with Playwright/Chromium before an executive demo.
- Program 4 is limited to Financial Governance / Value Governance; no unrelated roadmap scope was added.

## Tests executed

- `pnpm --filter @workspace/control-plane run test -- program4-financial-governance executive-value`
- `pnpm --filter @workspace/control-plane run typecheck`
- `pnpm --filter @workspace/control-plane run build`

## Final verdict

**PARTIAL** — Source-level acceptance criteria, mode boundaries, Finance Evidence Pack completeness, deterministic decision model, audit documentation, route coverage, and build checks pass. Market-ready browser certification remains pending because true browser screenshots cannot be captured in this container.
