# m365 lifecycle traceability

Deterministic lifecycle trace stages:
- GENERATED
- NEEDS_EVIDENCE
- NEEDS_TRUST_REVIEW
- GOVERNANCE_REVIEW_REQUIRED
- READY_FOR_REVIEW
- WORKFLOW_REVIEW
- ARBITRATED
- SIMULATED
- OUTCOME_PENDING
- OUTCOME_RESOLVED
- SUPPRESSED

Trace record requirements:
- recommendationId
- tenantId
- priorState
- nextState
- transitionReason
- trustBand
- governanceOutcome
- blockingFindings
- workflowId
- simulationId
- operatorId
- timestamp
- correlationId
- traceHash

Trace hashes must be deterministic and replay-verifiable.
