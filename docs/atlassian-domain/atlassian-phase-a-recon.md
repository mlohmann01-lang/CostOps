# Atlassian Phase A Recon

## CANONICAL_AUTHORITIES_TO_REUSE
- ConnectorTrustService
- EvidenceReconciliationService
- WorkflowOperationsService
- OperationalTelemetryService
- RecommendationArbitrationService
- PolicySimulationService
- Recommendation lifecycle authorities
- Existing replay/integrity helpers
- Existing graph/correlation authorities
- Existing outcome proof authorities

## ATLASSIAN_DOMAIN_EXTENSIONS
- Atlassian evidence normalization for canonical user/account/license/usage/recommendation context fields.
- Atlassian trust scoring adapters mapped to HIGH/MEDIUM/LOW/QUARANTINED.
- Atlassian reconciliation categories and suppression behaviors.
- Atlassian Phase A playbooks (inactive reclaim + admin/license governance).
- Atlassian telemetry event taxonomy through canonical telemetry authority.
- Atlassian replay/lifecycle parity coverage through existing replay/integrity tests.

## NO_FORK_ZONES
- No Atlassian-specific orchestration/workflow/replay/telemetry/lifecycle/governance subsystem.
- No execution expansion (READ_ONLY / RECOMMEND_ONLY / APPROVAL_REQUIRED only).

## RUNTIME_INHERITANCE_REQUIREMENTS
- Emit Atlassian runtime events through `OperationalTelemetryService` only.
- Persist lifecycle/replay semantics with canonical statuses and recommendation authorities.
- Keep all findings/recommendations deterministic and evidence-linked.

## FILES_EXPECTED_TO_CHANGE
- `artifacts/api-server/src/lib/atlassian/*`
- `artifacts/api-server/src/lib/playbooks/*` (Atlassian playbook registration)
- `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts`
- `artifacts/api-server/src/tests/*atlassian*` and runtime parity/replay tests
- `docs/atlassian-domain/*`
- selected architecture status docs

## FILES_EXPLICITLY_NOT_TO_TOUCH
- execution engine/orchestration mutation paths
- UI navigation/dashboard surfaces
- any Atlassian-specific subsystem roots
