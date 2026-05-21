# RBAC Matrix — Economic Operations Platform

## Role Definitions

| Role | Description | Typical User |
|---|---|---|
| `OWNER` | Full platform access, can approve own high-risk executions | Platform owner, CTO |
| `ADMIN` | Full tenant access | Tenant administrator |
| `ECONOMIC_OPERATOR` | Can request, simulate, rollback, verify, acknowledge drift. Cannot approve or execute live | Operations team |
| `APPROVER` | Can grant approvals, approve/reject executions and rollbacks. Cannot execute | Finance/compliance approver |
| `AUDITOR` | Read-only access to recommendations and audit log | Compliance auditor |
| `VIEWER` | Read-only access to recommendations | Stakeholder, manager |
| `CONNECTOR_ADMIN` | Can configure connectors. Cannot execute | IT/infrastructure team |

## Permission Matrix

| Permission | OWNER | ADMIN | ECONOMIC_OPERATOR | APPROVER | AUDITOR | VIEWER | CONNECTOR_ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `TENANT_READ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `TENANT_CONFIGURE` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `CONNECTOR_CONFIGURE` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `RECOMMENDATION_READ` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `SIMULATION_RUN` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `APPROVAL_REQUEST` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `APPROVAL_GRANT` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `EXECUTION_REQUEST` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `EXECUTION_APPROVE` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `EXECUTION_RUN` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `ROLLBACK_REQUEST` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `ROLLBACK_APPROVE` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `ROLLBACK_RUN` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `VERIFICATION_RUN` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `DRIFT_ACKNOWLEDGE` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `AUDIT_READ` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

## Intent Type → Required Permission

| Intent Type | Required Permission | Minimum Role |
|---|---|---|
| `SIMULATE` | `SIMULATION_RUN` | ECONOMIC_OPERATOR |
| `REQUEST_APPROVAL` | `APPROVAL_REQUEST` | ECONOMIC_OPERATOR |
| `APPROVE` | `APPROVAL_GRANT` | APPROVER |
| `REJECT` | `APPROVAL_GRANT` | APPROVER |
| `REQUEST_MORE_EVIDENCE` | `APPROVAL_REQUEST` | ECONOMIC_OPERATOR |
| `MARK_MANUAL_ONLY` | `EXECUTION_REQUEST` | ECONOMIC_OPERATOR |
| `EXECUTE` | `EXECUTION_RUN` | OWNER or ADMIN only |
| `VERIFY` | `VERIFICATION_RUN` | ECONOMIC_OPERATOR |
| `ROLLBACK` | `ROLLBACK_REQUEST` | ECONOMIC_OPERATOR |
| `ACKNOWLEDGE_DRIFT` | `DRIFT_ACKNOWLEDGE` | ECONOMIC_OPERATOR |
| `BLOCK` | `TENANT_CONFIGURE` | OWNER or ADMIN only |

## Route Protection Matrix

| Route | Method | Required Permission | Enforcement Point |
|---|---|---|---|
| `/api/economic-operations/intent` | POST | See Intent Type map above | `intentPermissionGuard` middleware |
| `/api/economic-operations/verify/:executionId` | POST | `VERIFICATION_RUN` | `requireOperatorPermission` middleware |
| `/api/economic-operations/alerts/:alertId/acknowledge` | POST | `DRIFT_ACKNOWLEDGE` | `requireOperatorPermission` middleware |
| `/api/economic-operations/command-center` | GET | `RECOMMENDATION_READ` (via `TENANT_READ`) | Auth context |
| `/api/economic-operations/actions/:executionId` | GET | `TENANT_READ` | Auth context |
| `/api/economic-operations/executions/:executionId/state` | GET | `TENANT_READ` | Auth context |
| `/api/economic-operations/jobs` | GET | `TENANT_READ` | Auth context |
| `/api/economic-operations/metrics` | GET | `TENANT_READ` | Auth context |

## AuthRole → OperatorRole Mapping

The API server uses `x-role` header (populated by upstream auth proxy or JWT claims).

| AuthRole (x-role header) | Maps to OperatorRole |
|---|---|
| `PLATFORM_ADMIN` | `OWNER` |
| `TENANT_ADMIN` | `ADMIN` |
| `APPROVER` | `APPROVER` |
| `OPERATOR` | `ECONOMIC_OPERATOR` |
| `VIEWER` | `VIEWER` |

Fine-grained override: `x-actor-role` header can specify any valid `OperatorRole` directly,
overriding the mapped role. This is intended for service accounts and integration tests.

## Separation of Duties Policies

### High-Risk Execution

For `EXECUTION_RUN` on any execution:
- An actor with `EXECUTION_REQUEST` cannot also perform `EXECUTION_RUN` without `OWNER`/`ADMIN` role
- `APPROVER` role can grant approval (`APPROVAL_GRANT`) but cannot trigger live execution
- `ECONOMIC_OPERATOR` can request and run rollback but cannot approve their own rollback
- Self-approval of high-risk executions is blocked for ECONOMIC_OPERATOR (enforced in `canApproveOwnExecution`)

### Read-Only Role Constraints

`AUDITOR` and `VIEWER` are explicitly prohibited from:
- Submitting any intent (all intent types require at minimum SIMULATION_RUN which they lack)
- Configuring connectors
- Acknowledging drift (no DRIFT_ACKNOWLEDGE)
- Running verifications

### Denied Action Audit Log

All denied RBAC checks are written to the in-memory audit log in `EconomicOperationsRbac`.
In production, this must be written to the `economic_operations_action_history` table
with `resultState: 'INTENT_BLOCKED_BY_POLICY'` and the denial reason.

Query denied actions:
```typescript
globalRbac.getDeniedAuditEntries()
// Returns: Array<{ tenantId, actorId, role, permission, allowed: false, reason, timestamp }>
```

## Tenant-Scoped Permissions

All RBAC checks include `tenantId`. An actor with APPROVER role for `TENANT-A` cannot
approve executions for `TENANT-B` — the `tenantId` in the check must match the
execution's tenant.

The `extractOperatorActor` function derives `tenantId` from (in priority order):
1. `x-tenant-id` request header (set by auth proxy from JWT claims)
2. `tenantId` query parameter
3. `tenantId` in request body

In production, `x-tenant-id` MUST be set by the auth proxy from the verified JWT claim.
Do NOT accept tenant context from the request body in production without header verification.
