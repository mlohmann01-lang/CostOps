# Platform Integrity Map

## Canonical Platform Flow
Tenant Context → Connector Evidence → Trust + Reconciliation → Governance Policy Evaluation → Recommendation Generation → Explainability + Rationale Persistence → Arbitration + Prioritization → Simulation → Workflow Review → Outcome Resolution → Telemetry / Audit / Replay

| Stage | Canonical service | Canonical route/API | Persistence tables | Telemetry | Replay/integrity artifact | Boundary rules | Known gaps |
|---|---|---|---|---|---|---|---|
| Tenant Context | `security/tenant-context.ts` + `authorization-service.ts` | guarded routes via `middleware/security-guards.ts` | tenant-scoped tables | operator activity events | tenant-scoped retrieval tests | no cross-tenant reads/writes | some routes still fallback to `default` tenant |
| Connector Evidence | `connectors/m365/m365-read-only-sync-service.ts` | `/connectors/*` | connector sync + evidence tables | connector health events | sync-generation separation tests | read-only data acquisition boundary | connector-specific direct reads in some flows |
| Trust + Reconciliation | `trust-engine.ts`, `reconciliation-engine.ts` | `/reconciliation`, recommendation flow inputs | trust/reconciliation artifacts | trust/reconciliation events | trust signal adapter + reconciliation tests | trust scoring must pass canonical engine | connector trust wrappers can diverge if misused |
| Governance Policy Evaluation | `governance/policy-engine.ts` | `/governance`, workflow/approval gateways | governance policy + exception tables | governance activity stream | governance policy/replay tests | policy decision required before execution gates | overlapping governance wrappers require clear ownership |
| Recommendation Generation | `playbooks/playbook-recommendation-service.ts` | `/recommendations/generate` | recommendations table | playbook evaluation events | recommendation flow/integrity tests | recommendations must not execute directly | route currently performs orchestration logic inline |
| Explainability + Rationale | `recommendation-rationale-persistence-service.ts` | rationale/read APIs and persistence | rationale snapshots | rationale persisted markers | deterministic hash + replay validation | rationale hashes immutable | coverage now centralized in replay integrity suite |
| Arbitration + Prioritization | `recommendation-arbitration-service.ts` | `/recommendations/arbitrate` | arbitration snapshots | prioritization events | arbitration snapshot history | arbitration cannot trigger execution | none material |
| Simulation | `simulations/policy-simulation-service.ts` | `/simulations` | policy simulations table | simulation create/read events | deterministic simulation hash | simulation is non-executing | route-level DB calls remain thin wrapper |
| Workflow Review | `workflow/workflow-operations-service.ts` | `/workflow/items/*` | workflow items/assignments/decisions | workflow events | decision trace persistence tests | approvals cannot bypass governance/runtime controls | workflow/orchestrator naming overlap |
| Outcome Resolution | `recommendation-outcome-resolution-service.ts`, `savings-proof-service.ts` | `/outcomes`, `/verification` | outcome + proof tables | outcome verification events | outcome deterministic integrity tests | outcome updates must be tenant-scoped | proof scope docs improved in this pass |
| Telemetry / Audit / Replay | `observability/operational-telemetry-service.ts` | `/telemetry/*`, replay/integrity endpoints | operational/governance/operator events | platform telemetry pipeline | replay integrity and isolation tests | telemetry queries tenant-scoped, correlation ids present | uneven adoption of centralized emit helper |

## Duplicate/Legacy Modules (tracked)
- Workflow orchestration helpers under `lib/workflows/*` are supporting/legacy relative to `workflow-operations-service.ts`.
- Governance wrappers (`execution-governance-policy-service.ts`) remain supporting; canonical evaluation remains `policy-engine.ts`.
- Connector-specific trust helpers remain supporting; canonical trust computation remains `trust-engine.ts`.


## P1 Integrity Status (2026-05-16)
- Tenant Context: REMEDIATED for core high-risk routes.
- Recommendation authority consolidation: PARTIALLY_REMEDIATED pending deeper route-to-service migration.
- Execution boundary static protections: REMEDIATED.

- M365 Phase A integrity: evidence normalization + trust/reconciliation expansion implemented in canonical M365 connector authorities.

## M365 Phase C Integrity Notes (2026-05-17)
- Replayability, lifecycle traceability, and telemetry consistency were prioritized for authority-aligned hardening.
- Remaining gap: uneven canonical telemetry adoption across all route and service edges (tracked as partial remediation).

## Operational Runtime Hardening Notes (2026-05-17)
- Telemetry parity and workflow SLA replayability were strengthened in canonical services.
- Replay completeness checks improved but legacy route-level parity remains partial.

## Operational Consistency Coverage Update (2026-05-17)
- Added runtime consistency diagnostics and telemetry coverage continuity helpers.
- Legacy bypass detection is now regression-tested; no execution boundary expansion observed.

## Adobe Phase A Integrity Mapping
- Telemetry parity: PARTIALLY_REMEDIATED
- Replay continuity: PARTIALLY_REMEDIATED
- Lifecycle continuity: PARTIALLY_REMEDIATED

## Adobe Phase B Integrity Mapping
- Runtime maturity: PARTIALLY_REMEDIATED

## Adobe Phase C Integrity Mapping
- Renewal/portfolio/drift/maturity/reporting runtime helpers: PARTIALLY_REMEDIATED.
- No Adobe-specific subsystem introduction observed.

## Atlassian Phase A Integrity Mapping
- Evidence/trust/reconciliation/playbook/telemetry/replay inheritance: PARTIALLY_REMEDIATED.
- No Atlassian-specific subsystem introduction observed.

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


## Phase B Runtime Persistence Hardening (2026-05-17)
- Status: PARTIALLY_REMEDIATED
- Canonical authority reuse confirmed; no-fork and no-execution-expansion constraints preserved.
- Remaining deep persistence/storage implementation details DEFERRED_WITH_REASON: this increment focused on runtime hardening diagnostics/test guardrails on existing spine.

## Phase C Sustained Runtime Load Simulation (2026-05-17)
- Status: PARTIALLY_REMEDIATED
- Sustained scale simulation implemented as read-only canonical helper extensions.
- No execution expansion and no subsystem forks introduced.
- Remaining production empirical calibration and real backfill benchmarking: DEFERRED_WITH_REASON.
