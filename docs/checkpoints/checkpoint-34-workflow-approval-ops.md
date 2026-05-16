# Checkpoint 34 — Workflow + Approval Operations

Implemented:
- Workflow DB schemas: workflow_items, workflow_assignments, policy_exceptions, approval_decisions.
- WorkflowOperationsService for item creation, assignments, decisions, exception lifecycle, deterministic expiry, SLA calculation.
- `/workflow` routes with tenant/capability guards.
- Operations Inbox UI and Policy Exception Review copy.
- Audit emission via operator activity events for workflow operations.

Constraints preserved:
- no auto-approval
- no execution path from workflow actions
- no governance bypass
