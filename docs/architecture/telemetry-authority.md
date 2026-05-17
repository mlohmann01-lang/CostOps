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

## Operational Consistency Coverage Update (2026-05-17)
- Telemetry authority now includes canonical required M365 runtime event coverage and continuity diagnostics hooks.

## Cross-Domain Phase A Update
- Status: PARTIALLY_REMEDIATED.
- Cross-domain intelligence aggregates canonical domain outputs only; no replacement authority introduced.
- Cross-domain telemetry/replay events added through canonical telemetry authority.
- Execution remains READ_ONLY/RECOMMEND_ONLY/APPROVAL_REQUIRED.


## Runtime Hardening Phase A Update
- Status: PARTIALLY_REMEDIATED.
- Runtime hardening extends canonical telemetry/workflow/reconciliation/simulation/outcome/diagnostics authorities only.
- No subsystem fork and no execution expansion introduced.
- Remaining production persistence depth: DEFERRED_WITH_REASON.


## Phase B Runtime Persistence Hardening (2026-05-17)
- Status: PARTIALLY_REMEDIATED
- Canonical authority reuse confirmed; no-fork and no-execution-expansion constraints preserved.
- Remaining deep persistence/storage implementation details DEFERRED_WITH_REASON: this increment focused on runtime hardening diagnostics/test guardrails on existing spine.

## Phase C Sustained Runtime Load Simulation (2026-05-17)
- Status: PARTIALLY_REMEDIATED
- Sustained scale simulation implemented as read-only canonical helper extensions.
- No execution expansion and no subsystem forks introduced.
- Remaining production empirical calibration and real backfill benchmarking: DEFERRED_WITH_REASON.
