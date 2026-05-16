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
