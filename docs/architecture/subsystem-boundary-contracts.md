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
