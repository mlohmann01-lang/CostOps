# Checkpoints 33–35 — Enterprise Hardening + Pilot Readiness Pack

## Context

Checkpoints 22–32 completed the core platform intelligence architecture:

Evidence → Trust → Reconciliation → Recommendation → Explainability → Outcomes → Simulation → Arbitration → Entity Graph → Governance DSL → Observability

Checkpoints 33–35 now transition the platform from architecture-complete to enterprise-pilot-ready.

Do not add new intelligence subsystems unless required for security, workflow, or pilot readiness.

## Canonical Phase Goal

Deliver enterprise-ready hardening and pilot operability through:

- strict multi-tenant isolation
- deterministic role/capability authorization
- secret handling and audit hardening
- workflow and approval operations
- policy exception lifecycle and SLA governance
- tenant provisioning and pilot readiness validation
- support-safe diagnostics
- deployment and runbook readiness
- demo-to-pilot safety separation

## Checkpoint 33 — Multi-Tenant Isolation + Security Hardening

### Objective

Harden tenant isolation, authorization, secrets, auditability, and security boundaries before real customer pilots.

This checkpoint must prove that one tenant can never access another tenant’s:

- connector data
- evidence records
- trust snapshots
- recommendations
- rationales
- decision traces
- outcomes
- simulations
- arbitration snapshots
- graph entities/edges
- governance policies
- telemetry
- operator actions

### Non-Negotiable Constraints

Do **not**:

- weaken existing governance controls
- bypass tenant filters for admin convenience
- expose raw secrets in logs, telemetry, errors, or UI
- allow cross-tenant graph traversal
- allow cross-tenant replay access
- allow cross-tenant policy evaluation
- add execution paths

All platform queries must be tenant-scoped unless explicitly operating in a safe system-admin diagnostic mode.

### Required Deliverables

1. **Tenant isolation audit** via `TenantIsolationAuditService`.
2. **Role/capability authorization** via deterministic `AuthorizationService` checks.
3. **Scoped route guards** (`requireTenantContext`, `requireCapability`, `requireTenantResourceAccess`).
4. **Secret governance** including `maskSecret(value)` (e.g. `********1234`).
5. **Audit hardening** into `operator_activity_events` and `operational_events`.
6. **Tenant-aware rate limits** for high-risk routes.
7. **Replay isolation** for integrity/replay endpoints.
8. **Graph isolation** for all entity/edge traversal paths.
9. **Security tests** covering tenant boundaries, authorization, masking, replay, graph, telemetry.
10. **Security docs** under `docs/security/` plus checkpoint summary.

### Validation Commands

```bash
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/api-client-react build
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/control-plane typecheck
pnpm --filter @workspace/api-server test -- tenant-isolation.test.ts authorization-service.test.ts route-guard-security.test.ts secret-masking.test.ts replay-isolation.test.ts graph-tenant-isolation.test.ts
```

### Acceptance Criteria

Checkpoint 33 is complete when:

- every major route is tenant-scoped
- authorization checks exist for sensitive operations
- secret masking works
- replay endpoints are tenant-isolated
- graph traversal is tenant-isolated
- audit events persist for sensitive actions
- security tests pass
- no execution/governance bypass is introduced

## Checkpoint 34 — Workflow + Approval Operations Layer

### Objective

Make the platform operationally usable for enterprise teams by adding workflow queues, reviewer assignment, approval operations, exception lifecycle, and SLA-aware review management.

### Non-Negotiable Constraints

Do **not**:

- auto-approve actions
- bypass policy engine outcomes
- weaken runtime controls
- convert simulation into execution
- allow expired exceptions to remain active silently
- allow approvals without audit trail

All workflow actions must be tenant-scoped, auditable, and policy-aware.

### Required Deliverables

1. **Workflow schemas**:
   - `workflow_items`
   - `workflow_assignments`
   - `policy_exceptions`
   - `approval_decisions`
2. **WorkflowOperationsService** for item creation, assignment, statusing, SLA, decisions, exceptions, expiry.
3. **Workflow source rules** for LOW trust, QUARANTINED review, critical reconciliation, approval-required governance, outcome and simulation review.
4. **Approval rules** with tenant scope, authorized approvers, evidence persistence, and audit events.
5. **Exception lifecycle** with explicit reason, expiry, approver, target, and policy version linkage.
6. **SLA states**: `HEALTHY`, `WARNING`, `BREACHED`.
7. **Workflow APIs** for item retrieval, assignment, decisions, exception create/approve/reject/revoke, and expiry.
8. **Operations Inbox UI** with required policy-safe copy.
9. **Policy Exception Review UI** with required lineage/expiry copy.
10. **Workflow tests** for persistence, security, lifecycle, SLA, and governance integrity.
11. **Workflow docs** under `docs/workflow/` plus checkpoint summary.

### Validation Commands

```bash
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/api-client-react build
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/control-plane typecheck
pnpm --filter @workspace/api-server test -- workflow-operations.test.ts workflow-assignment.test.ts approval-decisions.test.ts policy-exception-lifecycle.test.ts workflow-sla.test.ts
```

### Acceptance Criteria

Checkpoint 34 is complete when:

- workflow items persist
- assignments work
- approval decisions persist
- policy exceptions work
- exceptions expire deterministically
- SLA statuses work
- operations inbox UI renders
- all workflow actions are audited
- no governance bypass is introduced

## Checkpoint 35 — Enterprise Packaging + Pilot Readiness

### Objective

Prepare the platform for enterprise pilots by adding tenant provisioning, onboarding, connector setup guidance, operational runbooks, support tooling, pilot configuration, and deployment-readiness documentation.

### Non-Negotiable Constraints

Do **not**:

- add speculative features
- add new intelligence layers
- bypass security controls
- hardcode pilot data into production paths
- expose demo tenant data to real tenants
- weaken audit/replay constraints

### Required Deliverables

1. **Tenant provisioning** utilities (`pnpm provision:tenant`) for tenant + admin + defaults.
2. **Pilot configuration profile** (`pilotProfile`) with connector/playbook/trust/approval/telemetry/workflow defaults and `demoMode=false` by default.
3. **M365 connector onboarding checklist** (no credential exposure).
4. **Support diagnostics endpoint**: `GET /support/diagnostics` (tenant-scoped and secret-safe).
5. **Pilot readiness endpoint**: `GET /pilot/readiness` with readiness contract and status (`READY`, `NEEDS_CONFIGURATION`, `BLOCKED`).
6. **Pilot Readiness UI** with required readiness copy.
7. **Operational runbooks** for onboarding, connector setup, review operations, trust failures, policy exceptions, outcomes, and diagnostics.
8. **Deployment readiness documentation** (env vars, migration order, seed separation, rollback, observability, security).
9. **Demo-to-pilot separation** controls and tests.
10. **Pilot/readiness tests** for provisioning, readiness accuracy, diagnostics secrecy, and demo isolation.
11. **Pilot docs** under checkpoint, pilot, and deployment doc trees.

### Validation Commands

```bash
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/api-client-react build
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/control-plane typecheck
pnpm --filter @workspace/api-server test -- tenant-provisioning.test.ts pilot-readiness.test.ts support-diagnostics.test.ts demo-pilot-separation.test.ts
```

Manual validation where environment allows:

```bash
pnpm provision:tenant
pnpm seed:golden-demo
pnpm reset:golden-demo
```

### Acceptance Criteria

Checkpoint 35 is complete when:

- tenant provisioning exists
- default pilot config exists
- support diagnostics exists
- pilot readiness API exists
- pilot readiness UI renders
- connector onboarding checklist is documented
- runbooks exist
- deployment readiness is documented
- demo/pilot data is safely separated
- diagnostics expose no secrets
- tests pass

## Final Phase Exit Criteria

Checkpoints 33–35 are complete when the platform has all of:

- Tenant isolation
- Role/capability authorization
- Secret masking
- Replay isolation
- Graph isolation
- Workflow inboxes
- Approval decisions
- Policy exceptions
- Workflow SLAs
- Tenant provisioning
- Pilot readiness checks
- Support diagnostics
- Operational runbooks
- Deployment readiness documentation
- Demo-to-pilot separation

At that point, foundational architecture expansion should stop and the program should enter the **Design Partner Pilot Phase**, with learning sourced from real tenants and real operational friction.


## Checkpoint 34 Implementation Note

Checkpoint 34 now includes workflow schemas, guarded workflow APIs, deterministic SLA status handling, policy exception lifecycle controls, and Operations Inbox UI copy with no execution-path controls.
