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
