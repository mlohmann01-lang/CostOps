# Adobe Runtime Build Pass — Phase B Recon

## PHASE_A_IMPLEMENTED
- Adobe normalization service with explicit UNKNOWN handling.
- Adobe trust scoring helper with canonical trust bands.
- Adobe inactive reclaim + contractor cleanup playbooks on canonical registry.
- Adobe telemetry helper/event catalog through canonical telemetry authority.

## PHASE_A_PARTIALS
- Reconciliation runtime depth was taxonomy/scaffold heavy, not materially deep.
- Adobe simulation + outcome proof integration not yet implemented.
- Adobe replay/coverage assertions were event-catalog level only.

## PHASE_B_TARGETS
- Deterministic Adobe reconciliation findings + telemetry.
- Rightsizing/add-on/storage playbooks.
- Graph/correlation-driven trust and governance impacts.
- Simulation integration for Adobe recommendation mixes.
- Outcome proof evaluator for Adobe evidence before/after states.
- Runtime telemetry/replay coverage for Phase B event set.

## CANONICAL_AUTHORITIES_TO_REUSE
- `OperationalTelemetryService` (`emitAdobeEvent`/`emitM365Event`).
- `PlaybookRecommendationService` recommendation + lifecycle/replay paths.
- Reconciliation spine in `reconciliation-engine.ts`.
- Workflow authority in `workflow-operations-service.ts`.
- Simulation authority in `policy-simulation-service.ts`.
- Outcome authority in `recommendation-outcome-resolution-service.ts`.
- Graph/correlation authority in enterprise graph services.

## NO_FORK_ZONES
- No Adobe orchestration/workflow/telemetry/replay/lifecycle engines.
- No execution path expansion beyond recommend-only/approval-required.

## FILES_EXPECTED_TO_CHANGE
- `artifacts/api-server/src/lib/adobe/*`
- `artifacts/api-server/src/lib/playbooks/*`
- `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts`
- `artifacts/api-server/src/tests/adobe-*.test.ts`
- Adobe domain docs and architecture status docs listed in phase instructions.

## FILES_EXPLICITLY_NOT_TO_TOUCH
- UI pages/navigation under `artifacts/control-plane/src/pages/*`.
- Execution mutation engines under `artifacts/api-server/src/lib/execution/*`.
