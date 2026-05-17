# Subsystem Boundary Contracts

## Connector Ingestion
- Owns: connector data acquisition + normalization.
- Does not own: trust scoring, governance policy, execution.
- May call: trust adapters, telemetry.
- Must not call: execution engines directly.
- Persistence authority: connector evidence/sync tables.
- Route authority: `/connectors/*`.
- Replay/integrity: preserve source timestamp + ingestion run linkage.
- Tenant isolation: strict per-tenant connector records.

## Trust
- Owns: entity/recommendation/execution-readiness trust scoring.
- Does not own: recommendation arbitration, workflow decisions.
- May call: reconciliation signal adapters.
- Must not call: execution engines.
- Persistence authority: trust snapshots/derived fields.
- Route authority: consumed by recommendation/reconciliation flows.
- Replay/integrity: deterministic trust input factors where persisted.
- Tenant isolation: trust inputs and outputs tenant-scoped.

## Reconciliation
- Owns: findings correlation from connector evidence.
- Does not own: governance outcomes.
- May call: trust-signal mapping.
- Must not call: execution.
- Persistence authority: reconciliation artifacts.
- Route authority: `/reconciliation`.
- Replay/integrity: preserved reconciliation evidence links.
- Tenant isolation: no cross-tenant entity matching.

## Governance
- Owns: policy evaluation and exception lifecycle.
- Does not own: workflow assignment storage.
- May call: approval workflow service.
- Must not call: direct execution bypassing gates.
- Persistence authority: policy + exception tables.
- Route authority: `/governance`, exception paths.
- Replay/integrity: policy evaluation determinism by persisted inputs/versioning.
- Tenant isolation: policy decisions scoped by tenant context.

## Recommendation
- Owns: recommendation generation and scoring composition.
- Does not own: execution actuation.
- May call: trust/reconciliation/pricing/governance supports.
- Must not call: execution engines.
- Persistence authority: recommendations table.
- Route authority: `/recommendations`.
- Replay/integrity: recommendation rationale hash traceability.
- Tenant isolation: recommendation queries and inserts tenant-scoped.

## Explainability
- Owns: rationale persistence and retrieval shape.
- Does not own: policy simulation math.
- May call: recommendation context providers.
- Must not call: execution.
- Persistence authority: rationale snapshot artifacts.
- Route authority: explainability/replay endpoints.
- Replay/integrity: deterministic hash validation.
- Tenant isolation: tenant-bound rationale retrieval.

## Arbitration
- Owns: priority/conflict queue snapshots.
- Does not own: recommendation creation.
- May call: recommendation read models.
- Must not call: execution.
- Persistence authority: arbitration snapshot table.
- Route authority: `/recommendations/arbitrate`, `/prioritized-queue`.
- Replay/integrity: snapshot immutability by created timestamp/hash chain where applicable.
- Tenant isolation: arbitration per-tenant queue.

## Simulation
- Owns: simulation scoring/projection computation.
- Does not own: workflow decisioning.
- May call: governance/trust inputs.
- Must not call: execution.
- Persistence authority: `policySimulationsTable`.
- Route authority: `/simulations`.
- Replay/integrity: deterministic simulation hash and integrity endpoint.
- Tenant isolation: simulation reads/writes scoped by tenant.

## Workflow
- Owns: workflow item lifecycle, assignment, decisions.
- Does not own: direct action execution.
- May call: governance exception APIs.
- Must not call: execution engines directly.
- Persistence authority: workflow + approval tables.
- Route authority: `/workflow/*`.
- Replay/integrity: decision trace persistence.
- Tenant isolation: workflow decisions and assignments tenant-scoped.

## Execution Orchestration
- Owns: controlled execution and rollback orchestration.
- Does not own: recommendation generation.
- May call: governance execution policy and runtime controls.
- Must not call: recommendation generation routes.
- Persistence authority: execution orchestration tables.
- Route authority: `/execution`, `/execution-orchestration`.
- Replay/integrity: execution trace and outcome verification artifacts.
- Tenant isolation: execution actions constrained by tenant context.

## Outcome Proof
- Owns: outcome verification and savings proof evidence.
- Does not own: workflow assignment.
- May call: execution outcome services.
- Must not call: connector ingestion.
- Persistence authority: outcome/proof artifacts.
- Route authority: `/outcomes`, `/verification`.
- Replay/integrity: stable outcome integrity checks.
- Tenant isolation: proof retrieval tenant-scoped.

## Telemetry
- Owns: operational/governance/operator event aggregation access.
- Does not own: business action side effects.
- May call: observability integrations.
- Must not call: execution mutation paths.
- Persistence authority: operational/governance/operator events.
- Route authority: `/telemetry`.
- Replay/integrity: trace/correlation continuity across events.
- Tenant isolation: telemetry queries tenant-scoped.

## Graph
- Owns: operational entity graph build + correlation reads.
- Does not own: trust scoring policy.
- May call: relationship/entity resolvers.
- Must not call: execution.
- Persistence authority: entity + edge + correlation tables.
- Route authority: `/graph`.
- Replay/integrity: historical graph snapshots should not be regenerated silently.
- Tenant isolation: all traversals filtered by tenant.

## Security/Auth
- Owns: tenant context, RBAC, authorization checks.
- Does not own: business-level recommendation scoring.
- May call: audit services.
- Must not call: domain mutation routes directly.
- Persistence authority: auth/audit security artifacts.
- Route authority: middleware and auth routes.
- Replay/integrity: auth decisions auditable.
- Tenant isolation: mandatory.

## Pilot Readiness
- Owns: readiness synthesis and support diagnostics surface.
- Does not own: policy or execution decision authority.
- May call: tenant provisioning/support diagnostics services.
- Must not call: execution.
- Persistence authority: readiness/support diagnostics artifacts.
- Route authority: `/pilot/*`.
- Replay/integrity: readiness determinations reproducible from source signals.
- Tenant isolation: readiness by tenant only.


## P1 Boundary Status (2026-05-16)
- Recommendation/Simulation/Workflow routes explicitly protected from execution-engine imports by tests.
- Tenant context explicitly required in core recommendation/workflow/simulation/telemetry routes.

- M365 playbook expansion remains recommendation/simulation only; no execution boundary expansion.

- Phase B confirms no new subsystem; extended existing recommendation/governance/workflow/simulation authorities.

## Runtime Hardening Boundary Confirmation (2026-05-17)
- Runtime hardening changes remain telemetry/replay/workflow-diagnostics extensions only.
- No execution boundary expansion was introduced.

## Operational Consistency Coverage Boundary Confirmation (2026-05-17)
- Consistency hardening remains within telemetry/workflow/replay diagnostics boundaries.
- No workflow-triggered or recommendation-triggered execution expansion introduced.

## Adobe Phase B Boundary Notes
- No Adobe-specific engines introduced; canonical authorities extended only.

## Adobe Phase C Boundary Notes
- Adobe Phase C remains within recommendation/simulation/outcome/telemetry/replay boundaries.
- No execution expansion introduced (READ_ONLY/RECOMMEND_ONLY/APPROVAL_REQUIRED retained).

## Atlassian Phase B Update
- Status: PARTIALLY_REMEDIATED.
- Atlassian governance maturity extended via canonical reconciliation/workflow/telemetry/simulation/outcome/replay/graph authorities only.
- No execution expansion; execution remains READ_ONLY, RECOMMEND_ONLY, APPROVAL_REQUIRED.
- Deferred: renewal readiness aggregation and cross-domain governance (Phase C).


## Atlassian Phase C Update
- Status: PARTIALLY_REMEDIATED.
- Renewal/portfolio/drift/simulation-calibration/outcome-calibration/maturity/reporting implemented via canonical authorities only.
- Replay/telemetry continuity extended without subsystem forks.
- Remaining full persistence-backed aggregation: DEFERRED_WITH_REASON.


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

