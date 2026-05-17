# Adobe Runtime Build Pass — Phase A Recon

## CANONICAL_AUTHORITIES_TO_REUSE
- `artifacts/api-server/src/lib/connectors/m365/connector-trust-service.ts` (trust snapshot + trust-band degradation handling pattern)
- `artifacts/api-server/src/lib/reconciliation/reconciliation-engine.ts` (deterministic reconciliation finding persistence)
- `artifacts/api-server/src/lib/playbooks/playbook-recommendation-service.ts` (recommendation generation, suppression, lifecycle trace persistence, replay report)
- `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts` (canonical telemetry emission authority)
- `artifacts/api-server/src/lib/workflow/workflow-operations-service.ts` (workflow review creation and escalation)
- existing DB authorities: recommendations, suppressed recommendations, decision traces, workflow items, operational events.

## ADOBE_DOMAIN_EXTENSIONS
- Add Adobe normalization service that maps Adobe evidence to canonical recommendation context fields.
- Add Adobe trust evaluator producing canonical bands (`HIGH|MEDIUM|LOW|QUARANTINED`).
- Add Adobe reconciliation helper that writes canonical reconciliation findings and emits canonical telemetry.
- Extend playbook recommendation authority with Adobe Phase A playbooks:
  - inactive license reclaim
  - contractor cleanup
- Extend telemetry authority with Adobe event helper (`emitAdobeEvent`) and required Adobe runtime events catalog.

## NO_FORK_ZONES
- No Adobe-specific orchestration engine.
- No Adobe-specific telemetry storage/emitter subsystem.
- No Adobe-specific replay engine.
- No Adobe-specific workflow engine.
- No Adobe-specific lifecycle state model.

## RUNTIME_INHERITANCE_REQUIREMENTS
- Lifecycle state persistence must continue to use recommendation decision traces.
- Replay integrity calculation must continue via existing replay report logic.
- Workflow trace continuity must use existing `workflowItemsTable` and workflow service patterns.
- Telemetry must be written through `OperationalTelemetryService.emitEvent`.
- Recommendations remain `READ_ONLY / RECOMMEND_ONLY / APPROVAL_REQUIRED`.

## FILES_EXPECTED_TO_CHANGE
- `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts`
- `artifacts/api-server/src/lib/playbooks/registry.ts`
- `artifacts/api-server/src/lib/playbooks/playbook-recommendation-service.ts`
- `artifacts/api-server/src/lib/reconciliation/reconciliation-engine.ts`
- `artifacts/api-server/src/tests/runtime-telemetry-parity.test.ts`
- `artifacts/api-server/src/tests/runtime-replay-completeness.test.ts`
- New Adobe domain files under `artifacts/api-server/src/lib/adobe/*`
- New Adobe playbook files under `artifacts/api-server/src/lib/playbooks/*`
- New Adobe tests under `artifacts/api-server/src/tests/*`
- Adobe and architecture documentation updates requested in this phase.

## FILES_EXPLICITLY_NOT_TO_TOUCH
- UI pages under `artifacts/control-plane/src/pages/*` (no UI expansion)
- Execution mutation engines under `artifacts/api-server/src/lib/execution/*` (no execution expansion)
- New Adobe-specific runtime subsystems (none created)
