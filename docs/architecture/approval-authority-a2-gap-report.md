# Sprint A2 Approval Authority Gap Report

## 1. Approval models found

| Model | Storage | Pre-A2 authority behavior | A2 disposition |
| --- | --- | --- | --- |
| `approval_requests` / `approval_events` | Durable DB tables | Legacy request API could create, approve, reject, and execution engine could treat it as approval truth. | Compatibility/read/audit projection only. Legacy mutation routes are disabled or bridged to canonical submission. |
| `approval-workflows` / Approval Workflow Engine | In-memory workflow store | Staged workflow system with role routing, SoD, delegation, expiry/escalation, events, and execution-request creation on final approval. | Canonical approval authority. |
| Recommendation approval bridge | Recommendation route/service | Directly created workflows and emitted approval events. | Refactored to call `ApprovalAuthorityService.submitForApproval()`. |
| Execution request creation from approval | `ExecutionRequestService.createFromApprovedWorkflow()` | Triggered directly from approval workflow route when workflow became approved. | Triggered only by `ApprovalAuthorityService.approve()` with `sourceSystem: APPROVAL_WORKFLOW`. |
| Execution approval service | `executionApprovalsTable` | Separate governance approval service for execution approvals. | Not expanded; remains outside A2 canonical recommendation/workflow authority and cannot create execution requests through the new authority path. |

## 2. Canonical authority chosen

Canonical approval authority is the Approval Workflow Engine exposed through `approval-workflows` and wrapped by `approval-authority-service` / `/api/approval-authority`.

Reason: it already supports staged approvals, role routing, separation of duties, delegation, expiry, escalation, governance events, and downstream execution request creation.

## 3. Paths migrated

- `POST /api/recommendations/:id/submit-approval` now routes through `ApprovalAuthorityService.submitForApproval()`.
- `POST /api/approval-workflows/:workflowId/approve` and `reject` now route through `ApprovalAuthorityService`.
- Execution request creation now happens only when canonical authority approval transitions to approved.
- Execution engine approval checks use canonical approval status instead of legacy `approval_requests` status.
- Approval Workflows UI reads `/api/approval-authority` and approves through `/api/approval-authority/workflows/:workflowId/approve`.

## 4. Compatibility paths retained

- `/api/approvals` is retained for compatibility.
- Legacy approval creation is bridged to canonical authority submission where possible.
- Legacy approval list returns legacy rows with `sourceSystem: LEGACY_APPROVAL_REQUEST` and canonical approvals as projections.
- Legacy approve/reject endpoints return `410 LEGACY_APPROVAL_MUTATION_DISABLED` because direct legacy mutation is unsafe.

## 5. Remaining legacy usage

- Legacy `lib/governance/approval-workflow.ts` remains for older tests and compatibility utilities, but it is no longer used by execution engine approval checks or by `/api/approvals` mutations.
- Existing durable `approval_requests` / `approval_events` tables remain as audit/read compatibility storage.
- Unified approval workflows are still backed by the current in-memory workflow store.

## 6. Event coverage

Canonical approval event names are normalized through the unified event normalizer:

- `APPROVAL_SUBMITTED`
- `APPROVAL_STAGE_ENTERED`
- `APPROVAL_APPROVED`
- `APPROVAL_REJECTED`
- `APPROVAL_EXPIRED`
- `APPROVAL_ESCALATED`
- `APPROVAL_AUTHORITY_SYNCED`

Known gap: the unified event timeline remains memory-only. No new event store was introduced.

## 7. Execution request linkage impact

- Final approval through canonical workflow authority creates at most one execution request.
- `ExecutionRequestService.createFromApprovedWorkflow()` has an explicit `sourceSystem` guard and returns `null` for `LEGACY_APPROVAL_REQUEST`.
- Duplicate execution request prevention remains in `ExecutionRequestRepository` / `ExecutionRequestService`.

## 8. Remaining risks

- Risk level: Medium.
- The canonical workflow store is not durable yet; this is a pre-existing platform limitation.
- Legacy direct function imports can still manipulate `approval_requests` in old tests/utilities, but canonical API and execution paths no longer rely on those rows as approval truth.
- A future durability sprint should persist `ApprovalWorkflow` state to durable workflow tables and migrate historical legacy rows into read-only canonical projections.
