# Platform Integrity Recon

Date: 2026-05-16

## Git State
- Branch: `work`
- Latest commits: `f199ec4`, `02886a1`, `f65314f`, `99b3cac`, `d0a6f8a`
- Uncommitted changes at recon start: none
- Merge status: branch is linear from latest validation commit; no active merge conflict markers detected.

## Authority Baseline

| Domain | Canonical authority | Supporting modules | Duplicate/legacy candidates | Routes | Tests |
|---|---|---|---|---|---|
| governance | `lib/governance/policy-engine.ts` | `governance-policy-engine.ts`, `execution-governance-policy-service.ts` | route-local policy branching | `routes/governance.ts`, `routes/workflow.ts`, `routes/execution.ts` | `governance-policy-engine.test.ts`, `platform-authority-boundaries.test.ts` |
| workflow | `lib/workflow/workflow-operations-service.ts` | `governance/approval-workflow.ts` | `workflows/workflow-orchestrator.ts`, `workflows/workflow-orchestration-v2.ts` | `routes/workflow.ts`, `routes/approvals.ts` | `workflow-operations.test.ts`, `workflow-assignment.test.ts` |
| trust | `lib/trust-engine.ts` | `connectors/m365/connector-trust-service.ts`, `reconciliation/trust-signal-adapter.ts` | fragmented trust scoring under connector-specific logic | `routes/recommendations.ts`, `routes/connectors.ts` | `connector-trust.test.ts`, `trust-signal-adapter.test.ts` |
| reconciliation | `lib/reconciliation/reconciliation-engine.ts` | `trust-signal-mapper.ts` | ad hoc reconciliation in connector paths | `routes/reconciliation.ts` | `evidence-reconciliation.test.ts` |
| execution-orchestration | `lib/execution-orchestration/execution-orchestration-service.ts` | `execution/execution-engine.ts`, `execution/rollback-engine.ts` | direct execute calls outside orchestration | `routes/execution-orchestration.ts`, `routes/execution.ts` | `execution-orchestration-*.test.ts` |
| telemetry | `lib/observability/operational-telemetry-service.ts` | `lib/observability/platform-events.ts`, `lib/jobs/job-events.ts` | direct event table writes in routes | `routes/telemetry.ts`, `routes/platform-events.ts` | `operational-telemetry.test.ts` |
| graph | `lib/enterprise-graph/operational-entity-graph-service.ts` | `graph-intelligence-v2.ts`, `relationship-builder.ts` | parallel graph traversal helpers | `routes/graph.ts`, `routes/enterprise.ts` | `graph-tenant-isolation.test.ts`, `entity-graph-correlation.test.ts` |
| recommendation-intelligence | `lib/playbooks/playbook-recommendation-service.ts` | `recommendation-arbitration-service.ts`, `recommendation-rationale-persistence-service.ts` | recommendation generation in route handlers | `routes/recommendations.ts`, `routes/playbooks.ts` | `playbook-recommendation-flow.test.ts`, `recommendation-arbitration.test.ts` |
| simulation | `lib/simulations/policy-simulation-service.ts` | none | direct simulation math outside service | `routes/simulations.ts` | `policy-simulation.test.ts` |
| outcome-proof | `lib/execution-orchestration/savings-proof-service.ts` | `execution-outcome-verification-service.ts`, `recommendation-outcome-resolution-service.ts` | route-local outcome proof checks | `routes/outcomes.ts`, `routes/verification.ts` | `recommendation-outcome-resolution.test.ts`, `savings-proof.test.ts` |
| authorization-security | `lib/security/authorization-service.ts` | `middleware/security-guards.ts`, `lib/security/tenant-isolation.ts`, `lib/auth/rbac.ts` | unguarded routes and tenant default fallbacks | `routes/*` | `route-guard-security.test.ts`, `tenant-isolation.test.ts` |
| pilot-readiness | `lib/pilot-readiness-service.ts` | `tenant-provisioning-service.ts`, `support-diagnostics-service.ts` | readiness logic duplicated in docs/routes | `routes/pilot.ts`, `routes/onboarding.ts` | `pilot-readiness.test.ts`, `support-diagnostics.test.ts` |
| connector-ingestion | `lib/connectors/m365-ingestion.ts` + `m365-read-only-sync-service.ts` | connector SDK/normalizers | legacy ingestion paths | `routes/connectors.ts` | `m365-readonly-connector.test.ts`, `customer-demo-m365.test.ts` |
| pricing-intelligence | `lib/pricing/pricing-engine.ts` | none | inline pricing defaults in recommendation paths | `routes/recommendations.ts`, `routes/tenant-pricing.ts` | `realized-vs-projected.test.ts` |

## Risk Areas
- Duplicate authorities: governance/workflow/trust/execution have multiple similarly named modules and wrappers.
- Parallel routes: workflow/approvals and telemetry/platform-events have overlapping concerns.
- Unguarded route risks: several routes still default tenant from query/header without explicit guard middleware.
- Direct DB bypass risk: recommendation and simulation routes perform substantial DB logic directly.
- Replay/integrity gaps: core replay integrity exists per-feature but lacked a single platform-level integrity suite.
- Tenant isolation risks: default tenant fallback patterns still present in many route handlers.
- UI/API wiring drift risk: control-plane pages outnumber explicit canonical backend mappings in docs.
- Documentation staleness risk: authority registry existed but no platform-wide integrity map/contract docs before this pass.
