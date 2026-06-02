# Executive Value Dashboard Gap Report

## 1. Authorities reused

The Executive Value Dashboard reuses the existing Outcome Proof Authority for projected, approved, executed, verified, retained, and protected savings whenever those values exist. It uses Opportunity Authority only as an explicit projected-value fallback, Executive Prioritization for top drivers, Evidence Pack Authority for evidence generation and completeness, Platform Event Authority for activity and event emission, M365 Trust/Connector Health for confidence coverage, and Drift Authority for open drift exposure.

## 2. Metrics sourced

- Projected savings: Outcome Proof first; Opportunity Authority fallback only when proof projection is unavailable.
- Approved, executed, verified, retained, and protected savings: Outcome Proof Authority only.
- Evidence completeness: Evidence Pack Authority completeness, with proof evidence-summary fallback when packs do not exist.
- Trust coverage: M365/Data Trust summary.
- Connector coverage: M365 connector health.
- Execution coverage: completed execution evidence versus approval backlog.

## 3. Fallback metrics

Projected savings may fall back to Opportunity Authority so executives can see currently discovered value before an Outcome Proof exists. The dashboard marks this fallback through metric source metadata and does not use it for executed, verified, retained, or protected savings.

## 4. Evidence coverage

Evidence coverage is strongest when tenant-scoped evidence packs exist. Without packs, the engine derives a lower-confidence completeness signal from Outcome Proof evidence summaries and surfaces blockers recommending evidence-pack generation.

## 5. UI coverage

The control plane now includes an Executive Value Dashboard with value-realization funnel cards, narrative, confidence cards, value by domain, top drivers, blockers, and an executive evidence-pack call to action. Command, Outcome Proof, Evidence Packs, M365 Onboarding, Runtime Health, and the sidebar link back into the dashboard.

## 6. Remaining gaps

- Approval-authority linked values remain unavailable unless they are already reflected in Outcome Proof.
- Non-M365 domain confidence remains dependent on the availability of existing authority data.
- Execution coverage is intentionally conservative while controlled execution remains limited.

## 7. Customer readiness

The dashboard is customer-ready for board/CIO/CFO storytelling when Outcome Proof and Evidence Pack data are present. In early pilots it clearly distinguishes projected value from verified value and avoids unsupported claims.

## 8. Recommended next sprint

Add richer approval-authority linkage into Outcome Proof ingestion, expand domain-level confidence sources beyond M365, and create a board-ready export view that delegates to Evidence Pack Authority rather than duplicating evidence generation.
