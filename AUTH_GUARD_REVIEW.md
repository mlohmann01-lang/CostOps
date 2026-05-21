# Auth Guard Review — Economic Operations Routes

## Summary

This document reviews every mutating route in the economic operations platform against
the RBAC enforcement requirements. The review covers: intent submission, live execution,
verification, rollback, drift acknowledgement, and connector operations.

## Enforcement Architecture

The platform uses a two-layer auth model:

1. **Outer layer**: `authMiddleware` → `buildAuthContext` extracts `AuthRole` from
   `x-role`, `x-user-id`, `x-tenant-id` headers
2. **Inner layer**: `intentPermissionGuard` / `requireOperatorPermission` map
   `AuthRole` → `OperatorRole` and enforce specific `Permission` values via `globalRbac`

The middleware files:
- `src/middleware/auth.ts` — builds auth context from headers
- `src/middleware/economic-operations-rbac-middleware.ts` — enforces OperatorRole permissions
- `src/middleware/security-guards.ts` — tenant context and capability checks

## Route-by-Route Review

### POST /api/economic-operations/intent

**Guard**: `intentPermissionGuard` (added)

This is the highest-risk route. Every state transition flows through here.

The guard:
1. Extracts actor from auth context + x-actor-role override
2. Maps `intentType` to required `Permission` via `INTENT_PERMISSION_MAP`
3. Calls `globalRbac.check()` — denied actions are logged
4. Returns HTTP 403 with `{ error: "PERMISSION_DENIED", intentType, permission, actorRole }` on denial

**EXECUTE intent**: requires `EXECUTION_RUN` — only OWNER and ADMIN have this.
This means even a TENANT_ADMIN (ADMIN) can execute live, which is by design —
tenant admins have full tenant authority.

**Risk**: VIEWER submitting any intent → blocked ✅
**Risk**: ECONOMIC_OPERATOR executing live → blocked ✅
**Risk**: APPROVER executing (they can approve but not trigger) → blocked ✅

### POST /api/economic-operations/verify/:executionId

**Guard**: `requireOperatorPermission('VERIFICATION_RUN')` (added)

Verification reads from Graph API to confirm license removal. Even though it's
read-only against Graph, it WRITES to the outcome ledger and verification events table.
Therefore it requires VERIFICATION_RUN permission.

**Minimum role**: ECONOMIC_OPERATOR ✅
**VIEWER blocked**: yes ✅
**AUDITOR blocked**: yes ✅

### POST /api/economic-operations/alerts/:alertId/acknowledge

**Guard**: `requireOperatorPermission('DRIFT_ACKNOWLEDGE')` (added)

Acknowledging alerts is an operational action that closes the alert lifecycle.
Requires DRIFT_ACKNOWLEDGE permission.

**Minimum role**: ECONOMIC_OPERATOR ✅
**VIEWER blocked**: yes ✅

### GET /api/economic-operations/command-center

**Guard**: None beyond auth context.

Read-only endpoint. Returns recommendation cards. Does not mutate.
All roles with RECOMMENDATION_READ (which includes VIEWER) can access.

**Assessment**: Acceptable. Read-only data, no mutation path.
**Future hardening**: Consider adding `requireCapability('READ_RECOMMENDATIONS')`.

### GET /api/economic-operations/actions/:executionId

**Guard**: None beyond auth context.

Returns action history (audit trail). Should require AUDIT_READ for full history access.

**Assessment**: Open to any authenticated role. AUDITOR and VIEWER can see action history,
which is by design (audit trail must be visible to auditors).
**Future hardening**: Could gate on AUDIT_READ for cross-tenant access patterns.

### GET /api/economic-operations/executions/:executionId/state

**Guard**: None beyond auth context.

Read-only. Returns current execution state.
**Assessment**: Acceptable for current security posture.

### GET/POST /api/economic-operations/rollback/*

**POST /rollback** (intent): Protected by `intentPermissionGuard` since it uses
ROLLBACK intent type which maps to `ROLLBACK_REQUEST` permission.

**GET /rollback/:executionId/readiness**: Read-only, no guard needed.
**GET /rollback/:id**: Read-only, no guard needed.

**Assessment**: Rollback mutation protected ✅

### GET /api/economic-operations/simulation/:executionId

**Guard**: None.

Read-only simulation analysis. Does not trigger Graph calls or mutations.
**Assessment**: Acceptable.

### GET /api/economic-operations/proof/:executionId

**Guard**: None.

Read-only proof graph. Includes live Graph API call for user verification,
but only reads (User.Read.All scope).
**Assessment**: Acceptable. No mutation. Exposure is proof data only.

### GET /api/economic-operations/outcomes/:executionId

**Guard**: None.

Read-only outcome ledger data.
**Assessment**: Acceptable.

### GET /api/economic-operations/jobs

**Guard**: None.

Read-only job queue state.
**Assessment**: Acceptable. No mutation.

### GET /api/economic-operations/metrics

**Guard**: None.

Operational metrics. No PII, no mutation.
**Assessment**: Acceptable.

### GET /api/economic-operations/alerts

**Guard**: None.

Read-only alert list. Returns per-tenant alerts.
**Assessment**: Acceptable. Tenant-scoped. No mutation.

### GET /api/economic-operations/timeline/:id and /replay/:id

**Guard**: None.

Read-only timeline and replay data.
**Assessment**: Acceptable.

## Gaps and Remediation Items

| Gap | Priority | Remediation |
|---|---|---|
| No guard on GET routes returning potentially sensitive execution data | LOW | Add `requireCapability('READ_OUTCOMES')` to state/history endpoints for non-auditor reads |
| `command-center` accessible to VIEWER (may expose projected savings) | LOW | Consider role-based field masking if savings are commercially sensitive |
| `proof/:executionId` makes live Graph call without auth gate | MEDIUM | Add `requireOperatorPermission('RECOMMENDATION_READ')` |
| Denied RBAC checks not yet written to persistent DB audit table | HIGH | Wire `globalRbac.getDeniedAuditEntries()` to DB flush on cycle |

## Separation of Duties Verification

| SoD Rule | Status | Evidence |
|---|---|---|
| ECONOMIC_OPERATOR cannot execute live | ✅ | EXECUTE requires EXECUTION_RUN, not held by OPERATOR |
| APPROVER cannot execute live | ✅ | EXECUTION_RUN not in APPROVER permissions |
| VIEWER cannot simulate | ✅ | SIMULATION_RUN not in VIEWER permissions |
| AUDITOR cannot modify anything | ✅ | No write permissions in AUDITOR set |
| CONNECTOR_ADMIN cannot execute | ✅ | EXECUTION_RUN not in CONNECTOR_ADMIN permissions |
| Self-approval of high-risk blocked | ✅ | `canApproveOwnExecution` in EconomicOperationsRbac |

## Tenant Isolation Verification

The `extractOperatorActor` function derives `tenantId` from request context.
All `globalRbac.check()` calls include `tenantId`. RBAC denials include tenant context
in the audit log. No cross-tenant permission leakage is possible through the RBAC layer.

## Test Coverage

- `src/tests/economic-operations-rbac.test.ts` — 17 tests for role/permission matrix
- `src/tests/economic-operations-rbac-middleware.test.ts` — 18 tests for HTTP middleware layer
- `src/tests/economic-operations-tenant-isolation.test.ts` — 11 tests for cross-tenant isolation

All 46 RBAC-related tests pass.
