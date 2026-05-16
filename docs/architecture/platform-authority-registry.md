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
