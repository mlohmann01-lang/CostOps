# Production Runtime Phase B Recon

## CURRENT_PERSISTENCE_STRENGTHS
- Canonical services already centralize telemetry, workflow, reconciliation, simulation, rationale, outcome and graph persistence behaviors.
- Existing replay and integrity diagnostics already model lineage continuity and runtime integrity categories.
- Tenant context and isolation guards already exist in security/runtime helpers and are test-covered by prior phase tests.

## CURRENT_PERSISTENCE_GAPS
- Missing production-specific append-only assertions spanning rationale, decision traces, outcome snapshots, telemetry, workflow history, reconciliation findings, simulation snapshots and graph correlation snapshots.
- Replay diagnostics do not expose durableReplayReady, hash continuity state classification, and history window/depth details.
- Runtime diagnostics lack a production readiness aggregate and category-specific persistence durability health fields.

## HIGH_RISK_PRODUCTION_PATHS
- Historical record mutation risk in long-lived recommendation lifecycle traces.
- Replay durability under late, duplicate, or missing telemetry.
- Workflow backlog + reassignment chains causing stale/partial historical continuity.
- Tenant lineage mismatch during cross-table replay reconstruction.

## SCALE_RISK_AREAS
- Burst telemetry with ordering instability and retention drift.
- Large entity/edge graph growth causing stale snapshots and low-confidence correlation spikes.
- Long-lived unresolved reconciliation blockers creating recommendation lifecycle contention.

## DURABILITY_TARGETS
- Append-only snapshot history for all critical operational records.
- Deterministic hash continuity across replay and lineage chains.
- Tenant-scoped continuity for telemetry, workflow, reconciliation, graph and diagnostics.
- Production-grade readiness diagnostics with explicit health categories.

## CANONICAL_AUTHORITIES_TO_REUSE
- OperationalTelemetryService
- WorkflowOperationsService
- EvidenceReconciliationService
- RecommendationOutcomeResolutionService
- RecommendationOutcomeDriftService
- RecommendationRationalePersistenceService
- PolicySimulationService
- SupportDiagnosticsService
- OperationalEntityGraphService
- Existing replay/integrity and tenant isolation helpers

## NO_FORK_ZONES
- No new runtime spine.
- No new replay, telemetry, workflow, graph, execution, governance or persistence subsystem/framework.
- No execution automation expansion (read-only/recommend-only/approval-required remains intact).

## FILES_EXPECTED_TO_CHANGE
- `artifacts/api-server/src/lib/runtime-hardening/runtime-hardening-phase-a.ts`
- `artifacts/api-server/src/tests/*.test.ts` (new Phase B hardening tests)
- `docs/runtime-hardening/*.md` (Phase B recon/report/topic docs)
- `docs/architecture/platform-authority-registry.md`
- `docs/architecture/platform-integrity-map.md`
- `docs/architecture/foundational-gap-register.md`
- `docs/architecture/subsystem-boundary-contracts.md`
- `docs/architecture/telemetry-authority.md`

## FILES_EXPLICITLY_NOT_TO_TOUCH
- UI pages/components and navigation surfaces.
- Execution orchestration autonomy codepaths.
- Domain-pack expansion surfaces unrelated to persistence/runtime hardening.
