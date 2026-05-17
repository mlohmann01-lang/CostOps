# Recommendation Lifecycle Authority

Canonical lifecycle stages:
- GENERATED — owned by `playbook-recommendation-service.ts`
- TRUST_REVIEW_REQUIRED — owned by `playbook-recommendation-service.ts` status derivation
- GOVERNANCE_REVIEW_REQUIRED — owned by governance policy evaluation + recommendation service state derivation
- WORKFLOW_REVIEW — owned by `workflow-operations-service.ts` as workflow state only
- ARBITRATED — owned by `recommendation-arbitration-service.ts`
- SIMULATED — owned by `policy-simulation-service.ts` (read-only consumer of recommendations)
- OUTCOME_PENDING — owned by `recommendation-outcome-resolution-service.ts`
- OUTCOME_RESOLVED — owned by `recommendation-outcome-resolution-service.ts`
- SUPPRESSED — owned by `playbook-recommendation-service.ts`

Routes are read/delegation boundaries and must not derive lifecycle status independently.

- Phase A lifecycle gating expanded for M365 evidence freshness/trust/reconciliation statuses and suppressions.

- Added M365 deterministic lifecycle state derivation helper for Phase B.

## M365 Phase C lifecycle trace extension (2026-05-17)
Lifecycle traceability requires deterministic persistence across:
GENERATED, NEEDS_EVIDENCE, NEEDS_TRUST_REVIEW, GOVERNANCE_REVIEW_REQUIRED,
READY_FOR_REVIEW, WORKFLOW_REVIEW, ARBITRATED, SIMULATED,
OUTCOME_PENDING, OUTCOME_RESOLVED, SUPPRESSED.
