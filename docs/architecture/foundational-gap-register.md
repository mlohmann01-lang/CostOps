# Foundational Gap Register

## P0
- None currently identified in this pass.

## P1
1. **Domain:** authorization-security
   - **Description:** Several routes still derive tenant from default/query values rather than strict mandatory tenant guard.
   - **Evidence:** route patterns in `routes/recommendations.ts`, `routes/telemetry.ts`, `routes/graph.ts`.
   - **Affected files/modules:** listed routes + `middleware/security-guards.ts`.
   - **Recommended fix:** enforce `requireTenantContext()` consistently and remove fallback defaults.
   - **New service required?:** No.
   - **Extend existing authority?:** Yes, extend security guard authority.

2. **Domain:** recommendation-intelligence
   - **Description:** recommendation route includes significant orchestration logic and direct DB writes.
   - **Evidence:** `routes/recommendations.ts` contains generation loop, trust, exception, and insert behavior.
   - **Affected files/modules:** `routes/recommendations.ts`, `playbook-recommendation-service.ts`.
   - **Recommended fix:** incrementally move orchestration into canonical recommendation service.
   - **New service required?:** No.
   - **Extend existing authority?:** Yes.

## P2
1. **Domain:** telemetry
   - **Description:** telemetry emission pathways are mixed between direct writes and service helpers.
   - **Evidence:** direct table query/write patterns in route handlers.
   - **Affected files/modules:** `routes/telemetry.ts`, observability modules.
   - **Recommended fix:** consolidate emission wrappers under operational telemetry service.
   - **New service required?:** No.
   - **Extend existing authority?:** Yes.

## P3
1. **Domain:** docs
   - **Description:** some legacy module names remain potentially confusing.
   - **Evidence:** overlapping names such as `workflow-orchestration-v2` vs canonical workflow operations.
   - **Affected files/modules:** authority docs and legacy helpers.
   - **Recommended fix:** deprecation annotations and naming cleanup pass.
   - **New service required?:** No.
   - **Extend existing authority?:** Yes.


## P1 Remediation Status Update (2026-05-16)
- recommendation-intelligence: PARTIALLY_REMEDIATED (route delegation boundary improved; residual orchestration remains)
- authorization-security: REMEDIATED (core default tenant fallbacks removed in key routes)
- telemetry: PARTIALLY_REMEDIATED (authority docs + route guard consistency; broader legacy writes remain)

- 2026-05-16: Expanded M365 domain playbook pack coverage and documentation stubs.

- M365 Phase A gaps: evidence/trust/reconciliation foundation PARTIALLY_REMEDIATED; downstream telemetry breadth DEFERRED.

- Phase B: lifecycle/governance/arbitration/workflow/simulation/renewal-readiness status: REMEDIATED (telemetry partial).

## Phase C Gap Status Update (2026-05-17)
- telemetry: PARTIALLY_REMEDIATED (M365 taxonomy + authority alignment documented; complete emission parity still pending).
- lifecycle replay traceability: PARTIALLY_REMEDIATED.
- workflow escalation reconstruction: PARTIALLY_REMEDIATED.
- outcome/simulation correlation: PARTIALLY_REMEDIATED.

## Operational Runtime Hardening Status (2026-05-17)
- telemetry parity: PARTIALLY_REMEDIATED.
- replay completeness: PARTIALLY_REMEDIATED.
- workflow recovery/SLA behavior: REMEDIATED for canonical workflow authority paths.
- orphan state detection: PARTIALLY_REMEDIATED.
- full legacy edge parity: DEFERRED_WITH_REASON (requires broader route-to-service consolidation).

## Operational Consistency & Coverage Pass (2026-05-17)
- runtime consistency/coverage pass: PARTIALLY_REMEDIATED (implemented coverage detectors, diagnostics, and parity tests).
- remaining deeper route-to-service migration: DEFERRED_WITH_REASON (requires broader refactor scope). 

- Adobe Phase A runtime inheritance extension added (telemetry/playbook/trust normalization): PARTIALLY_REMEDIATED.

- Adobe Phase B runtime maturity added: PARTIALLY_REMEDIATED.

- Adobe Phase C commercial governance maturity: PARTIALLY_REMEDIATED (helper and test coverage added; full persistence-backed route integration DEFERRED_WITH_REASON pending broader refactor).

- Atlassian Phase A runtime inheritance: PARTIALLY_REMEDIATED (core helper + test coverage complete; full source-ingestion persistence DEFERRED_WITH_REASON).

## Atlassian Phase B Update
- Status: PARTIALLY_REMEDIATED.
- Atlassian governance maturity extended via canonical reconciliation/workflow/telemetry/simulation/outcome/replay/graph authorities only.
- No execution expansion; execution remains READ_ONLY, RECOMMEND_ONLY, APPROVAL_REQUIRED.
- Deferred: renewal readiness aggregation and cross-domain governance (Phase C).


## Atlassian Phase C Update
- Status: PARTIALLY_REMEDIATED.
- Renewal/portfolio/drift/simulation-calibration/outcome-calibration/maturity/reporting implemented via canonical authorities only.
- Replay/telemetry continuity extended without subsystem forks.
- Remaining full persistence-backed aggregation: DEFERRED_WITH_REASON.


## Cross-Domain Phase A Update
- Status: PARTIALLY_REMEDIATED.
- Cross-domain intelligence aggregates canonical domain outputs only; no replacement authority introduced.
- Cross-domain telemetry/replay events added through canonical telemetry authority.
- Execution remains READ_ONLY/RECOMMEND_ONLY/APPROVAL_REQUIRED.


## Runtime Hardening Phase A Update
- Status: PARTIALLY_REMEDIATED.
- Runtime hardening extends canonical telemetry/workflow/reconciliation/simulation/outcome/diagnostics authorities only.
- No subsystem fork and no execution expansion introduced.
- Remaining production persistence depth: DEFERRED_WITH_REASON.

