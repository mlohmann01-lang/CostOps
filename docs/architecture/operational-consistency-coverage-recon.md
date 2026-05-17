# Operational Consistency & Coverage Recon

Date: 2026-05-17

## FULLY_COVERED_PATHS
- Canonical workflow SLA breach telemetry + persistence via `WorkflowOperationsService`.
- Replay integrity baseline assertions in existing runtime replay tests.
- Execution boundary non-expansion protections in boundary tests.

## PARTIALLY_COVERED_PATHS
- Route-to-authority parity in recommendation/simulation/telemetry routes.
- Telemetry continuity metadata (trace/correlation) across all runtime events.
- Lifecycle transition persistence validation breadth across full state set.
- Replay chain continuity across workflow/simulation/outcome/correlation links.
- Workflow reassignment/escalation replay continuity and stale-chain detection.

## LEGACY_BYPASS_PATHS
- Route-local orchestration and persistence in recommendation route edges.
- Mixed direct telemetry emission vs centralized telemetry service usage.
- Route-level lifecycle derivation/replay shaping in non-canonical edges.

## ROUTE_LEVEL_INCONSISTENCIES
- Inconsistent authority-first enforcement checks for route handlers.
- Uneven mutation prohibition checks (route-local write-like logic) in tests.

## MISSING_TELEMETRY_PATHS
- Explicit coverage checks for downgrade/suppression/escalation/mismatch event families.
- Diagnostics for missing telemetry continuity/correlation metadata.

## MISSING_LIFECYCLE_PERSISTENCE_PATHS
- Explicit runtime validation for complete state transition set and duplicate/invalid transitions.

## MISSING_REPLAY_CONTINUITY_PATHS
- Chain-level continuity checks spanning recommendation/lifecycle/workflow/simulation/outcome.
- Hash/tenant/correlation mismatch detections consolidated into one coverage assertion.

## MISSING_WORKFLOW_TRACE_PATHS
- Full lifecycle trace checks for reassignment, exception approval/revocation, stale unresolved workflows.

## FILES_EXPECTED_TO_CHANGE
- `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts`
- `artifacts/api-server/src/lib/support-diagnostics-service.ts`
- `artifacts/api-server/src/lib/workflow/workflow-operations-service.ts`
- `artifacts/api-server/src/tests/*.test.ts` (runtime consistency coverage + regression updates)
- `docs/architecture/*.md` (consistency coverage report + authority/integrity docs)

## FILES_EXPLICITLY_NOT_TO_TOUCH
- Execution engines/orchestrators and auto-remediation paths.
- UI/dashboard route trees and navigation modules.
- New subsystem/service scaffolds (prohibited).
