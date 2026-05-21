# Security Review — Economic Operations Platform

## Review Scope

This document reviews the production security posture of the platform against:
- Tenant isolation
- RBAC enforcement
- Secret safety
- Fail-closed behavior
- Audit immutability
- Demo/preview isolation

## 1. Tenant Isolation

### Implementation

Every data access path enforces tenant scoping:

| Layer | Mechanism |
|---|---|
| DB queries | `WHERE tenant_id = $tenantId` on every table |
| Auth context | `x-tenant-id` header required in production |
| Job workers | Jobs scoped per `tenantId`, never cross-tenant aggregation |
| Lock keys | `tenantId:resourceType:resourceId` prefix |
| Events and alerts | `tenantId` field required on all records |
| RBAC checks | `tenantId` included in every `globalRbac.check()` call |

### Tenant Isolation Test Results

From `economic-operations-tenant-isolation.test.ts` (11 tests, all passing):

| Test | Result |
|---|---|
| Cross-tenant intent rejected | ✅ |
| Cross-tenant action history returns empty | ✅ |
| Job query filters by tenantId | ✅ |
| Lock keys scoped per tenant, no conflict | ✅ |
| Events scoped by tenantId | ✅ |
| Alerts scoped by tenantId | ✅ |
| Acknowledge only affects correct tenant | ✅ |
| Flexera result scoped by tenantId | ✅ |
| ServiceNow preserves tenant context | ✅ |
| Cross-tenant proof graph returns empty | ✅ |
| Demo tenant mode isolated from production | ✅ |

### Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Default tenant fallback in production | `DEFAULT_TENANT_FALLBACK=false` is fail-closed |
| Missing tenant header | Returns 400 in production (`requireTenantContext`) |
| Cross-tenant admin access | `PLATFORM_ADMIN` role override is explicit, logged |

## 2. RBAC Enforcement

### Route Protection Coverage

Protected routes (as of this review):
- `POST /intent` → `intentPermissionGuard` (permission depends on intentType)
- `POST /verify/:executionId` → `requireOperatorPermission('VERIFICATION_RUN')`
- `POST /alerts/:alertId/acknowledge` → `requireOperatorPermission('DRIFT_ACKNOWLEDGE')`

### Separation of Duties

- ECONOMIC_OPERATOR cannot execute live (requires EXECUTION_RUN, not granted)
- APPROVER cannot execute live (requires EXECUTION_RUN, not granted)
- VIEWER cannot simulate (requires SIMULATION_RUN, not granted)
- AUDITOR is fully read-only
- Self-approval of high-risk executions blocked for non-OWNER/ADMIN roles

### Denied Action Logging

All RBAC denials are logged in `globalRbac.getDeniedAuditEntries()` with:
- tenantId, actorId, role, permission, reason, timestamp

**Gap**: Denied action audit entries not yet persisted to database. In-memory only.
**Remediation**: Wire `getDeniedAuditEntries()` flush to DB on each request cycle.

## 3. Secret Safety

### Verified Non-Exposure Paths

| Path | Secret Safe? |
|---|---|
| Structured logs | ✅ `secret-masking.ts` masks known secret keys |
| API responses | ✅ No credentials returned in any endpoint |
| Frontend | ✅ Frontend receives no connector credentials |
| Test fixtures | ✅ Tests use `MOCK_CONNECTOR` mode, no real secrets |
| DB storage | ✅ Secrets not persisted to database |
| Error messages | ⚠️ Review needed: ensure Graph API errors don't echo tokens |

### Secret Masking Implementation

Located in `src/lib/security/secret-masking.ts` and `secret-redaction.ts`.
Keys masked: `clientSecret`, `apiKey`, `password`, `secret`, `token`, `DATABASE_URL`.

**Recommendation**: Run the secret masking tests against all log output paths
before each production deployment.

## 4. Production Fail-Closed Validation

### Config Validator Checks

`validateProductionConfig()` in `src/lib/config/production-config-validator.ts` runs at startup.

| Condition | Fail-Closed? | Status |
|---|---|---|
| Missing `DATABASE_URL` | ✅ | Validated |
| `DEFAULT_TENANT_FALLBACK=true` | ✅ | Validated |
| `M365_LIVE_LICENSE_MUTATION_ENABLED=true` without `AUTH_REQUIRED=true` | ✅ | Validated |
| `DEMO_MODE=true` | ✅ | Validated |
| `DEMO_FIXTURES_ENABLED=true` | ✅ | Validated |
| `PREVIEW_MODE=true` | ✅ | Validated |
| `ALLOWED_ORIGINS=*` | ✅ | Validated |
| `JWT_SECRET` < 32 chars | ✅ | Validated |

If any fail-closed condition is detected in `NODE_ENV=production`, the process exits
with a non-zero code and logs all violations. **The service will not start.**

### DB Write Fail-Closed

Following the hardening in commit `725f5f4`, all DB write failures in `submitIntent`
re-throw in production (`NODE_ENV=production`). This means:
- Failed action history write → 500 returned to caller (not silently swallowed)
- Failed idempotency write → 500 returned (no silent duplicate risk)
- Failed execution state write → 500 returned

## 5. Audit Immutability

### Action History

`economic_operations_action_history` table uses INSERT-only writes. No UPDATE or DELETE
paths exist in the intent service. Each intent submission creates a new record.

State changes are recorded as history entries, not mutations of existing records.

### Verification Events

`economic_operations_verification_events` table is INSERT-only.
Each verification run creates a new record. The idempotency check (`verificationState === 'VERIFIED'`) returns the existing result rather than overwriting.

### Drift Events

`economic_operations_drift_events` table is INSERT-only.
Acknowledging drift does NOT delete or modify the drift event — it creates an
acknowledgement state update on the alert, not the event itself.

### Rollback Events

`economic_operations_rollback_events` is INSERT-only. Rollback execution creates
a new record alongside (not replacing) the original execution record.

## 6. Demo / Preview Isolation

### Demo Mode Guards

When `tenantMode = 'DEMO'`:
- Execution transitions are allowed but `ledgerEnvironment = 'DEMO'`
- `isFixtureBacked = true` on all outcomes
- Demo tenant cannot be confused with production tenant

The outcome metadata (`getOutcome()`) always returns `ledgerEnvironment: DEMO` for
demo tenants, making it impossible to confuse demo results with production savings.

### Preview Mode

`PREVIEW_MODE=true` fails the production config validator.
Preview features are not accessible in production environments.

## 7. Graph API Safety

### Scope Enforcement

Write scopes (`LicenseAssignment.ReadWrite.All`) are only invoked when:
1. `M365_LIVE_LICENSE_MUTATION_ENABLED=true`
2. `grantedGraphScopes` includes the write scope
3. All readiness gates pass (tenant mode, approval, connector readiness)
4. Execution intent was approved by a different actor (SoD)

### Blast Radius Control

- License operations target individual users (not bulk tenant-wide)
- Maximum one concurrent high-risk operation per tenant
- Rollback plan verified before execution is permitted
- Verification window defined (2 days) before drift scan triggers

## Assessment Summary

| Area | Status | Priority Gaps |
|---|---|---|
| Tenant isolation | ✅ Implemented and tested | None |
| RBAC enforcement | ✅ Implemented on mutating routes | Persist denied audit log to DB |
| Secret safety | ✅ Masking implemented | Test coverage for log paths |
| Fail-closed config | ✅ All conditions validated | None |
| Audit immutability | ✅ INSERT-only patterns | None |
| Demo isolation | ✅ Ledger environment tagged | None |
| Graph API safety | ✅ Readiness gated | None |
