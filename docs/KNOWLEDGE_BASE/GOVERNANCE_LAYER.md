# GOVERNANCE LAYER

## Position of runtime controls
Runtime controls are now part of governance enforcement, not scaffolding. They complement governance decisions but do not replace them.

## Governance precedence remains intact
Runtime controls must not override:
- Trust evaluation
- Risk classification
- Authentication/authorization
- Approval requirements
- Policy constraints

## Enforcement semantics
- Denials (`BLOCK`, `QUARANTINE`) remain hard-stop outcomes.
- Warnings (`WARN`) remain evidence-rich pass-through outcomes.
- Escalation requirements (`REQUIRE_APPROVAL_ESCALATION`) remain explicit governance signals.

## Auditability
Each runtime-control outcome is evented through platform observability with tenant/correlation context and evidence payloads.
