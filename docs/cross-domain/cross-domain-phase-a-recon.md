# Cross-Domain Governance Intelligence — Phase A Recon

## MATURE_DOMAIN_INPUTS
- M365 runtime domain outputs (trust/replay/telemetry/runtime maturity).
- Adobe phase-c governance outputs (renewal/portfolio/drift/maturity/reporting).
- Atlassian phase-c governance outputs (renewal/portfolio/drift/maturity/reporting).

## CANONICAL_AUTHORITIES_TO_CONSUME
- OperationalEntityGraphService.
- OperationalTelemetryService.
- RecommendationArbitrationService.
- PolicySimulationService.
- RecommendationOutcomeResolutionService.
- SupportDiagnosticsService.
- Existing replay/integrity helpers.
- Existing workflow diagnostics.

## NO_FORK_ZONES
- No cross-domain execution/workflow/telemetry/replay/governance/recommendation engines.
- Aggregate and correlate only; do not replace domain authorities.

## CROSS_DOMAIN_TARGETS
- Identity exposure intelligence.
- Portfolio governance signals.
- Duplicate/overlap detection.
- Admin exposure intelligence.
- Workflow pressure intelligence.
- Governance drift signals.
- Enterprise operational maturity aggregation.
- Telemetry/replay inheritance completion.

## FILES_EXPECTED_TO_CHANGE
- `artifacts/api-server/src/lib/cross-domain/types.ts`
- `artifacts/api-server/src/lib/cross-domain/cross-domain-governance-intelligence.ts`
- `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts`
- `artifacts/api-server/src/tests/cross-domain-*.test.ts`
- `artifacts/api-server/src/tests/runtime-telemetry-parity.test.ts`
- `artifacts/api-server/src/tests/runtime-replay-completeness.test.ts`
- `artifacts/api-server/src/tests/runtime-consistency-diagnostics.test.ts`
- `artifacts/api-server/src/tests/platform-replay-integrity.test.ts`
- `artifacts/api-server/src/tests/platform-operational-flow.test.ts`
- `artifacts/api-server/src/tests/platform-subsystem-boundaries.test.ts`
- `artifacts/api-server/src/tests/execution-boundary-protection.test.ts`
- `docs/cross-domain/*.md`
- `docs/architecture/platform-authority-registry.md`
- `docs/architecture/platform-integrity-map.md`
- `docs/architecture/foundational-gap-register.md`
- `docs/architecture/subsystem-boundary-contracts.md`
- `docs/architecture/telemetry-authority.md`

## FILES_EXPLICITLY_NOT_TO_TOUCH
- UI/dashboard navigation surfaces.
- Execution/mutation handlers.
- Domain authority internals not required for cross-domain aggregation.
