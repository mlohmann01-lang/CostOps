# Atlassian Phase B Recon

## PHASE_A_IMPLEMENTED
- Evidence normalization and trust scoring runtime inheritance.
- Atlassian reconciliation runtime with blocker/suppression mapping.
- Phase A playbooks for inactive reclaim/admin/group/site/marketplace review.
- Atlassian telemetry and replay parity baseline.

## PHASE_A_PARTIALS
- Marketplace governance granularity (overlap/owner/admin risk) is partial.
- Workspace entropy and permission topology modeling are not fully explicit.
- Graph/correlation influence is implicit and not fully surfaced in Atlassian artifacts.

## PHASE_B_TARGETS
- Marketplace governance playbooks/findings expansion.
- Workspace/site entropy governance signals/playbooks.
- Permission topology conflict findings.
- Drift intelligence signals and telemetry.
- Simulation maturity guardrails for suppression/evidence/risk.
- Outcome proof inheritance payload rules.
- Telemetry/replay event maturity and tests.

## CANONICAL_AUTHORITIES_TO_REUSE
- EvidenceReconciliationService runtime patterns.
- WorkflowOperationsService review escalation semantics.
- OperationalTelemetryService event emission.
- RecommendationArbitrationService suppression/governance lifecycle.
- PolicySimulationService confidence/scope semantics.
- Outcome proof authority persistence contracts.
- Replay integrity helpers.
- Graph/correlation authority trust and ownership correlation.

## NO_FORK_ZONES
- No Atlassian-specific orchestration engine.
- No Atlassian-specific replay engine.
- No Atlassian-specific telemetry pipeline.
- No Atlassian-specific simulation subsystem.
- No execution/mutation expansion.

## FILES_EXPECTED_TO_CHANGE
- `artifacts/api-server/src/lib/atlassian/types.ts`
- `artifacts/api-server/src/lib/atlassian/atlassian-reconciliation-runtime.ts`
- `artifacts/api-server/src/lib/playbooks/atlassian-phase-a-playbooks.ts`
- `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts`
- `artifacts/api-server/src/tests/*atlassian*`
- `artifacts/api-server/src/tests/runtime-telemetry-parity.test.ts`
- `artifacts/api-server/src/tests/runtime-replay-completeness.test.ts`
- `artifacts/api-server/src/tests/runtime-consistency-diagnostics.test.ts`
- `artifacts/api-server/src/tests/platform-replay-integrity.test.ts`
- `artifacts/api-server/src/tests/platform-operational-flow.test.ts`
- `artifacts/api-server/src/tests/platform-subsystem-boundaries.test.ts`
- `docs/atlassian-domain/*phase-b*`
- `docs/architecture/platform-authority-registry.md`
- `docs/architecture/platform-integrity-map.md`
- `docs/architecture/foundational-gap-register.md`
- `docs/architecture/subsystem-boundary-contracts.md`

## FILES_EXPLICITLY_NOT_TO_TOUCH
- UI navigation/dashboard code paths.
- Any execution engine mutation handlers.
- Non-Atlassian domain orchestration internals unrelated to parity assertions.
