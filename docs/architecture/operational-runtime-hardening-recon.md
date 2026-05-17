# operational runtime hardening recon

IMPLEMENTED_RUNTIME_BEHAVIOR
- Canonical telemetry emission wrapper exists in OperationalTelemetryService and is used in recommendation/workflow/outcome/replay paths.
- Lifecycle transitions are persisted in deterministic decision trace records for playbook-generated recommendations.
- Replay report endpoint exists with baseline VALID/PARTIAL/INCOMPLETE/MISMATCH status computation.
- Workflow escalation history endpoint exists through WorkflowOperationsService.
- Simulation/outcome correlation retrieval endpoint exists.

PARTIAL_RUNTIME_BEHAVIOR
- Telemetry parity is incomplete across trust/reconciliation/arbitration/simulation-gating edges.
- Replay completeness checks are present but do not validate full required event chain and continuity strongly.
- Workflow recovery and SLA breach handling are not consistently persisted/escalated via canonical telemetry.
- Correlation continuity checks across recommendation→workflow→simulation→outcome are incomplete.
- Orphan/partial state detection is not centralized.

KNOWN_RUNTIME_GAPS
- Missing canonical events for trust degraded/quarantined, reconciliation blocker, arbitration, workflow SLA breach, simulation gated.
- Limited lifecycle edge-case handling for suppression precedence and stale evidence downgrade transitions.
- Replay report does not fully detect tenant mismatch and required telemetry omissions.
- Support diagnostics does not expose consolidated runtime integrity health summary.

HARDENING_TARGETS
- Extend existing authorities only to enforce telemetry parity and continuity.
- Strengthen replay report and orphan-state detection logic.
- Add deterministic workflow SLA breach/escalation persistence behavior.
- Add runtime health assertions through SupportDiagnosticsService extension.
- Add runtime hardening test suite for parity/completeness/edge-case behavior.

FILES_EXPECTED_TO_CHANGE
- artifacts/api-server/src/lib/observability/operational-telemetry-service.ts
- artifacts/api-server/src/lib/playbooks/playbook-recommendation-service.ts
- artifacts/api-server/src/lib/workflow/workflow-operations-service.ts
- artifacts/api-server/src/lib/recommendations/recommendation-outcome-resolution-service.ts
- artifacts/api-server/src/lib/support-diagnostics-service.ts
- artifacts/api-server/src/routes/playbooks.ts
- artifacts/api-server/src/tests/runtime-*.test.ts
- docs/architecture/operational-runtime-hardening-report.md
- docs/architecture/runtime-telemetry-parity.md
- docs/architecture/runtime-replay-completeness.md
- docs/architecture/runtime-workflow-recovery.md
- docs/architecture/foundational-gap-register.md
- docs/architecture/platform-integrity-map.md
- docs/architecture/telemetry-authority.md
- docs/architecture/subsystem-boundary-contracts.md
- docs/architecture/platform-authority-registry.md

FILES_NOT_TO_TOUCH
- execution engines and execution orchestration behavior boundaries
- control-plane UI navigation/dashboard artifacts
- connector mutation logic and graph mutation paths
