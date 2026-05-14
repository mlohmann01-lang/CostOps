# EXECUTION ENGINE

## Runtime controls integration
Execution engine runtime controls now execute on the enforcement path for recommendation actions and produce explicit runtime decisions.

## Ordering and boundaries
Execution still honors existing gate ordering:
1. Identity/AuthZ/Tenant checks
2. Trust/Risk/Policy/Approval gates
3. Runtime controls (additional enforcement layer)

Runtime controls cannot bypass or override earlier governance layers.

## Outcome mapping
- `BLOCK` / `QUARANTINE`: execution denied.
- `WARN`: execution may proceed, evidence captured.
- `REQUIRE_APPROVAL_ESCALATION`: execution path marks escalation and emits warning-class event.

## Observability
Execution engine emits platform events for runtime control outcomes with correlation IDs and evidence payloads.
