# Telemetry Authority

- Canonical emission authority: `operational-telemetry-service.ts`.
- Allowed wrappers: domain services that call canonical telemetry service.
- Prohibited pattern: route-level direct writes to telemetry tables for new events.
- Event taxonomy: operational, governance, operator-activity, connector-health.
- Correlation requirements: lifecycle flows must include `correlationId` or `traceId`; tenant-scoped flows must include tenantId.

- Phase A M365 trust/evidence/reconciliation events reserved under canonical telemetry emission authority.

## M365 Phase C telemetry authority update (2026-05-17)
- Canonical M365 telemetry taxonomy is documented in `docs/m365-domain/m365-telemetry-taxonomy.md`.
- Correlation requirements: lifecycle and workflow events must include `correlationId` and/or `traceId`.
- Replay integrity events reserved: `M365_REPLAY_VALIDATED`, `M365_REPLAY_MISMATCH`.
- Workflow escalation telemetry must remain emitted via canonical operational telemetry service wrappers.

## Operational Runtime Hardening Update (2026-05-17)
- Extended canonical runtime emissions across trust/reconciliation/arbitration/workflow-SLA/replay paths.
- Canonical wrapper remains `OperationalTelemetryService` via domain service calls.
