# Checkpoint 17 — Governance Console

- Added `execution_governance_policies` persistence and API management routes.
- Added `ExecutionGovernancePolicyService` policy evaluation for recommendation handoff, batch checks, automation promotion, and rollback recommendation.
- Added `execution_approvals` persistence and `ExecutionApprovalService` with request/approve/reject/expire/status lifecycle.
- Approval actions emit platform events and only alter eligibility state.
- Runtime `BLOCK`/`QUARANTINE` semantics remain non-overridable in policy service evaluation.
- Added `/governance` console with policy library, approval queue, and governance control panels.
