# Telemetry Authority

- Canonical emission authority: `operational-telemetry-service.ts`.
- Allowed wrappers: domain services that call canonical telemetry service.
- Prohibited pattern: route-level direct writes to telemetry tables for new events.
- Event taxonomy: operational, governance, operator-activity, connector-health.
- Correlation requirements: lifecycle flows must include `correlationId` or `traceId`; tenant-scoped flows must include tenantId.
