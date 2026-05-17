# Platform Authority Registry

## Authority-First Build Rule

Before creating a new service/module:

1. Search this registry for an existing domain authority.
2. Extend canonical authority where possible.
3. Create a new authority only if no domain fit exists.
4. Document why non-duplicate creation is required.
5. Update this registry and the authority usage report.

## Domain Authorities

### Governance
- Canonical: `artifacts/api-server/src/lib/governance/policy-engine.ts`
- Supporting: `execution-governance-policy-service.ts`, `execution-approval-service.ts`
- Legacy/duplicate candidates: ad hoc policy checks in route handlers.
- Routes: `routes/governance.ts`, `routes/workflow.ts`, `routes/execution.ts`
- Do not use directly: route-local policy branching where canonical engine exists.

### Workflow
- Canonical: `artifacts/api-server/src/lib/workflow/workflow-operations-service.ts`
- Supporting: `routes/workflow.ts`
- Duplicate candidates: direct workflow table writes from unrelated services.

### Trust
- Canonical: `artifacts/api-server/src/lib/trust-engine.ts`
- Supporting: `connectors/m365/connector-trust-service.ts`, `reconciliation/trust-signal-adapter.ts`
- Duplicate candidates: custom trust scoring in route handlers.

### Reconciliation
- Canonical: `artifacts/api-server/src/lib/reconciliation/reconciliation-engine.ts`
- Supporting: `trust-signal-adapter.ts`, `trust-signal-mapper.ts`

### Execution/Orchestration
- Canonical: `artifacts/api-server/src/lib/execution-orchestration/execution-orchestration-service.ts`
- Supporting: `execution/execution-engine.ts`, `execution/rollback-engine.ts`

### Telemetry
- Canonical: `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts`
- Supporting: `operational_events` and `operator_activity_events` writes.

### Graph
- Canonical: `artifacts/api-server/src/lib/enterprise-graph/operational-entity-graph-service.ts`
- Supporting: `graph-intelligence-v2.ts`, `relationship-builder.ts`

### Recommendation Intelligence
- Canonical: `artifacts/api-server/src/lib/playbooks/playbook-recommendation-service.ts`
- Supporting: `recommendation-arbitration-service.ts`, `recommendation-rationale-persistence-service.ts`

### Simulation
- Canonical: `artifacts/api-server/src/lib/simulations/policy-simulation-service.ts`

### Outcome Proof
- Canonical: `artifacts/api-server/src/lib/execution-orchestration/savings-proof-service.ts`
- Supporting: `execution-outcome-verification-service.ts`, `recommendation-outcome-resolution-service.ts`

### Authorization/Security
- Canonical: `artifacts/api-server/src/lib/security/authorization-service.ts`
- Supporting: `middleware/security-guards.ts`, `lib/security/tenant-isolation.ts`, `lib/auth/rbac.ts`

### Pilot Readiness
- Canonical: `artifacts/api-server/src/lib/pilot-readiness-service.ts`
- Supporting: `tenant-provisioning-service.ts`, `support-diagnostics-service.ts`
- Duplicate candidates: readiness logic embedded in routes.


## Platform Integrity Notes
- Do not create a new service/module until this registry has been checked and canonical authority extension has been evaluated.
- Validator-only modules (replay/integrity) are allowed only as non-authority helpers and must be listed explicitly.

### Duplicate/Legacy Tracking (2026-05-16)
- Governance wrappers: `governance-policy-engine.ts`, `execution-governance-policy-service.ts` are supporting modules; canonical evaluation remains `governance/policy-engine.ts`.
- Workflow legacy helpers: `lib/workflows/workflow-orchestrator.ts` and `lib/workflows/workflow-orchestration-v2.ts` are non-canonical relative to `lib/workflow/workflow-operations-service.ts`.
- Trust support modules: `connectors/m365/connector-trust-service.ts`, `reconciliation/trust-signal-adapter.ts`, and `reconciliation/trust-signal-mapper.ts` are supporting only; canonical trust scoring remains `lib/trust-engine.ts`.
- Execution helpers: `execution/execution-engine.ts` and `execution/rollback-engine.ts` are supporting execution internals; canonical execution authority remains `execution-orchestration/execution-orchestration-service.ts`.

### Deprecation/Consolidation Guidance
- Prefer migrating route-level orchestration to canonical services over introducing new wrappers.
- Mark legacy wrappers as compatibility layers until references are removed.


## P1 Remediation Status (2026-05-16)
- Recommendation authority consolidation: PARTIALLY_REMEDIATED
- Tenant context consistency: REMEDIATED
- Telemetry path consistency: PARTIALLY_REMEDIATED
- UI/API contract enforcement: PARTIALLY_REMEDIATED
- Execution boundary protection: REMEDIATED

- M365 domain pack expansion aligns with canonical authorities (recon in docs/m365-domain/m365-domain-expansion-recon.md).

- M365 Phase A: ConnectorTrustService/EvidenceReconciliationService/M365EvidenceNormalizationService extended (no new engines).

- Phase B lifecycle/governance authority extension recorded (May 16, 2026).

## Phase C Status Update (2026-05-17)
- M365 Phase C recon completed: `docs/m365-domain/m365-phase-c-recon.md`.
- Telemetry/outcome/lifecycle/replay extensions remain constrained to existing canonical authorities.
- New subsystem introduction remains prohibited and unobserved in this phase.

## Operational Runtime Hardening Status (2026-05-17)
- Runtime hardening recon completed: `docs/architecture/operational-runtime-hardening-recon.md`.
- Hardening pass extended existing canonical authorities only; no new subsystem introduced.

## Operational Consistency Coverage Update (2026-05-17)
- OperationalTelemetryService extended with required runtime event catalog and coverage detection.
- SupportDiagnosticsService extended with runtime consistency diagnostics projection.
- Status: PARTIALLY_REMEDIATED.
