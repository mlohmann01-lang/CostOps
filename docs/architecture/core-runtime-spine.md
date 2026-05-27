# Core Runtime Spine (Certen)

## Purpose
This document consolidates the canonical **governed economic operations spine** and clarifies boundaries between discovery, governance, execution, verification, and ledgering.

## Architecture Map
1. **Discovery lifecycle**
   - Connector ingestion and normalization produce trusted evidence records.
   - Discovery candidates are evaluated into governed recommendations.
2. **Operational graph**
   - Entities and relationships (identity, entitlement, policy, execution, outcome) are represented in graph-aligned models.
   - Graph context supports traceability and policy-aware reasoning.
3. **Governed recommendation object**
   - Recommendation includes trust/readiness/risk posture, evidence pointers, policy blockers, and projected savings.
4. **Governance events**
   - State transitions are auditable via deterministic event entries.
5. **Execution request**
   - Recommendation becomes an execution request with tenant scope, idempotency, policy constraints, and expiry.
6. **Dry run**
   - Simulated execution computes impact and rollback readiness without mutating provider state.
7. **Execution result**
   - Governed execution records evidence, warnings/errors, actor, and rollback reference.
8. **Outcome verification**
   - Post-execution checks validate realized outcome vs projected intent.
9. **Drift monitoring**
   - Periodic checks detect reversals/regressions and elevate governance events.
10. **Policy scheduler**
   - Read-only scheduler reevaluates approvals/dry-runs/recommendations/connectors/requests.
11. **Outcome ledger**
   - Aggregated economic proof layer for projected vs verified savings and governance-controlled realization.

## Service Boundary Review

### Recommendations
- Owns recommendation formation, trust/readiness posture, projected savings.
- Should not own execution mutation mechanics.

### Execution
- Owns request lifecycle, dry run/execution processing, rollback references.
- Should not redefine recommendation scoring logic.

### Outcomes
- Owns verification, drift signals, and economic rollups.
- Should consume execution evidence, not re-implement execution policy.

### Governance / Policy
- Governance owns approvals and stateful controls.
- Policy owns deterministic evaluation rules; scheduler invokes policy read-only checks.

### Graph
- Cross-cutting context model; should remain dependency-light and not embed mutation logic.

### Connectors
- Source-of-truth evidence adapters; mutation paths remain explicitly gated and constrained.

## Overlap / Duplication Notes
- Governance routes currently expose overlapping policy endpoints; unify to a single canonical set in a cleanup sprint.
- Outcome summary exists in legacy and ledger-specific routes; preserve compatibility now, consolidate later.
- Event names vary by subsystem; normalize through a canonical taxonomy (see below).

## Event Taxonomy Review (Normalization)
Recommended canonical families:
- `GOVERNANCE_*` (approval/policy/scheduler governance state)
- `EXECUTION_*` (request, dry-run, execute, rollback lifecycle)
- `OUTCOME_*` (verify, partial verify, fail, drift)
- `POLICY_*` (reevaluation and deterministic policy decisions)
- `AUDIT_*` (cross-cutting immutable audit trails)

Normalization rules:
- Use uppercase snake case.
- Prefer explicit lifecycle verbs: `REQUESTED`, `APPROVED`, `EXECUTED`, `VERIFIED`, `FAILED`, `EXPIRED`, `DETECTED`.
- Avoid semantically duplicated aliases where one canonical event exists.

