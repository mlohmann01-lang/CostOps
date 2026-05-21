# Fail-Closed Validation

## Purpose

This document validates that every critical failure path in the Economic Operations Platform
causes the system to stop or reject — not silently proceed with incorrect or incomplete state.

Fail-closed means: **when in doubt, refuse and alert rather than guess and act.**

---

## 1. Production Config Validator

File: `src/lib/config/production-config-validator.ts`

The config validator runs at startup. If any condition is violated in `NODE_ENV=production`,
the process exits with a non-zero code. **The service will not start.**

### Validated Conditions

| Condition | Fail-Closed Behavior |
|---|---|
| `DATABASE_URL` missing | Process exits — no DB connection available |
| `DEFAULT_TENANT_FALLBACK=true` | Process exits — would allow cross-tenant data access |
| `M365_LIVE_LICENSE_MUTATION_ENABLED=true` without `AUTH_REQUIRED=true` | Process exits — live mutation without auth is unsafe |
| `DEMO_MODE=true` | Process exits — demo fixtures must not run in production |
| `DEMO_FIXTURES_ENABLED=true` | Process exits — fixture data must not pollute production |
| `PREVIEW_MODE=true` | Process exits — preview features blocked in production |
| `ALLOWED_ORIGINS=*` | Process exits — wildcard CORS disallowed |
| `JWT_SECRET` < 32 characters | Process exits — weak secret disallowed |
| `TENANT_ISOLATION_ENABLED=false` | Process exits — isolation must be enforced |

### Validation Test

To verify the validator fires correctly:

```bash
# Should exit non-zero with violation list
NODE_ENV=production DEFAULT_TENANT_FALLBACK=true node dist/index.js
# Expected: process.exit(1) with message "Production config violations found"

# Should start successfully
NODE_ENV=production \
  DATABASE_URL=postgres://... \
  AUTH_REQUIRED=true \
  TENANT_ISOLATION_ENABLED=true \
  ALLOWED_ORIGINS=https://app.example.com \
  JWT_SECRET=<32-char-secret> \
  node dist/index.js
```

---

## 2. DB Write Fail-Closed (Intent Service)

File: `src/lib/economic-operations-intent-service.ts`

All database writes in `submitIntent()` and related methods use a catch block that
**re-throws in production**, ensuring failures are surfaced rather than silently swallowed.

### Write Operations Covered

| Operation | Catch Behavior in Production |
|---|---|
| Insert action history record | Re-throws → 500 returned to caller |
| Insert idempotency record | Re-throws → 500 returned to caller |
| Update execution state | Re-throws → 500 returned to caller |
| Insert verification event | Re-throws → 500 returned to caller |
| Insert drift event | Re-throws → 500 returned to caller |
| Insert rollback event | Re-throws → 500 returned to caller |
| Upsert outcome ledger entry | Re-throws → 500 returned to caller |

### Pattern

```typescript
try {
  await db.insert(economic_operations_action_history).values({ ... });
} catch(e) {
  if (env === 'production') throw e;
  // DB unavailable in dev/test — continue
}
```

**Silent swallow in development** is intentional to support local development
without a running PostgreSQL instance. In production, the re-throw ensures
the action is not accepted without a write record.

### Manual Verification

```bash
# Simulate DB failure in production
NODE_ENV=production DATABASE_URL=postgres://bad-host/db node dist/index.js
# POST /intent → should return HTTP 500
# Should NOT return HTTP 200 { accepted: true }
```

---

## 3. Execution Readiness Gate

Before any live execution is permitted, a multi-stage readiness check runs.
Every gate must pass. Any failure blocks execution.

### Gate Sequence

```
1. tenantMode check         → must not be DEMO
2. M365_LIVE_LICENSE_MUTATION_ENABLED check → must be true
3. connectorReadiness check → connector must be READY
4. approvalState check      → must be APPROVED
5. separationOfDuties check → approver ≠ requester (non-OWNER)
6. ServiceNow gate          → CHG must be in IMPLEMENT state
7. rollbackPlanVerified     → rollback target must be resolvable
8. noActiveLock             → no concurrent operation on same user
```

If any gate returns a non-passing state, intent is rejected with reason code.

### Fail-Closed Gate Test

```typescript
// Execution should be blocked if CHG is not in IMPLEMENT state
const result = await svc.submitIntent({
  intentType: 'EXECUTE',
  tenantId: 'TENANT-A',
  executionId: 'exec-1',
  actorId: 'operator-1',
});

// SERVICENOW_MODE=MOCK_CONNECTOR returns state=ASSESS by default
expect(result.accepted).toBe(false);
expect(result.reason).toBe('INTENT_BLOCKED_BY_POLICY');
```

---

## 4. Duplicate Execution Guard (Idempotency)

Idempotency keys prevent duplicate executions even under retry conditions.

### Behavior

| Scenario | Behavior |
|---|---|
| First EXECUTE intent for execution | Accepted, idempotency record written |
| Duplicate EXECUTE intent (same tenantId + executionId) | Rejected with `ALREADY_EXECUTED` |
| Retry after DB write failure | Fails-closed (500), no phantom idempotency bypass |

The idempotency key is `(tenantId, executionId)`. An execution that was already processed
cannot be re-run without an explicit ROLLBACK + new execution cycle.

---

## 5. Rollback Mutation Gate

Rollback is guarded separately from forward execution.

### Gates

| Gate | Fail-Closed? |
|---|---|
| `M365_LIVE_LICENSE_ROLLBACK_ENABLED=true` required | Yes — rollback mutation disabled by default |
| Rollback requires `ROLLBACK_APPROVE` intent first | Yes — cannot rollback without separate approval |
| Original execution record must exist | Yes — cannot rollback a non-existent execution |
| Rollback approval by different actor (SoD) | Yes — self-approval of rollback blocked |
| ServiceNow: emergency CHG must reach IMPLEMENT | Yes — rollback change request still gated |

```bash
# Rollback must not proceed without enablement flag
M365_LIVE_LICENSE_ROLLBACK_ENABLED=false node dist/index.js
# POST /intent { intentType: "ROLLBACK" } → INTENT_BLOCKED_BY_POLICY
```

---

## 6. Tenant Isolation Fail-Closed

Cross-tenant access attempts are silently rejected (404/empty result), never leaked.

### Verification

```bash
# TENANT-B attempting to read TENANT-A execution
GET /executions/exec-123/state?tenantId=TENANT-B
# → DB query: WHERE tenant_id = 'TENANT-B' AND execution_id = 'exec-123'
# → No rows found → HTTP 404

# TENANT-B submitting intent for TENANT-A execution
POST /intent { tenantId: "TENANT-B", executionId: "exec-owned-by-A" }
# → execution = executions.get("TENANT-B:exec-owned-by-A")
# → undefined → { accepted: false, reason: "INTENT_REJECTED" }
```

If `TENANT_ISOLATION_ENABLED=false` in `NODE_ENV=production`, the process does not start.

---

## 7. Missing Tenant Context

The `requireTenantContext()` guard (in `security-guards.ts`) returns 400 if the
incoming request has no tenant context in production.

### Behavior

| Condition | Response |
|---|---|
| `x-tenant-id` header present | Proceeds normally |
| `x-tenant-id` header missing in production | HTTP 400 `MISSING_TENANT_CONTEXT` |
| `DEFAULT_TENANT_FALLBACK=true` in production | Process does not start |

This ensures no request is processed without an explicit tenant scope.

---

## 8. RBAC Denial Fail-Closed

Insufficient permission → 403 with reason code, never proceeds.

### Tested Cases

| Actor | Intent | Expected |
|---|---|---|
| `VIEWER` submitting `EXECUTE` intent | Missing `EXECUTION_RUN` | 403 PERMISSION_DENIED |
| `ECONOMIC_OPERATOR` approving execution | Missing `APPROVAL_GRANT` | 403 PERMISSION_DENIED |
| `APPROVER` self-approving own request | SoD violation | 403 SELF_APPROVAL_BLOCKED |
| Unauthenticated request to `/intent` | No auth context | 403 PERMISSION_DENIED |

RBAC denials are logged in `globalRbac.getDeniedAuditEntries()`.

---

## 9. Connector Failure Fail-Closed

### M365 Connector

| Failure | Behavior |
|---|---|
| Token acquisition failure | Execution blocked — `connectorReadiness: AUTH_FAILED` |
| Graph API 401 | Execution blocked — alert created |
| Graph API 5xx | Execution blocked — connector transitions to DEGRADED |
| Network timeout | Execution blocked — retry with backoff, then DEGRADED |

### ServiceNow Connector

| Failure | Behavior |
|---|---|
| Unable to create CHG | Execution blocked — cannot proceed without change record |
| CHG not in IMPLEMENT state | Execution blocked — `INTENT_BLOCKED_BY_POLICY` |
| Evidence attachment failure | Logged, alert created — execution already complete, evidence write retried |

### Flexera Connector

| Failure | Behavior |
|---|---|
| API unavailable | Reconciliation skipped — proceeds without trust boost |
| API 401 | Alert created `AUTH_FAILED`, enrichment blocked |
| Stale data (>24h) | Trust boost suppressed, confidence degraded |

Flexera failure does NOT block execution — it degrades gracefully.
M365 and ServiceNow failures DO block execution.

---

## 10. Fail-Closed Summary Matrix

| Failure Path | Fail-Closed? | Response |
|---|---|---|
| Bad production config at startup | ✅ | Process exits, service does not start |
| DB write failure (action history) | ✅ | HTTP 500 |
| DB write failure (idempotency) | ✅ | HTTP 500 |
| DB write failure (execution state) | ✅ | HTTP 500 |
| Missing tenant context | ✅ | HTTP 400 |
| Insufficient RBAC permission | ✅ | HTTP 403 |
| Duplicate execution attempt | ✅ | Rejected with ALREADY_EXECUTED |
| Live mutation without enablement flag | ✅ | INTENT_BLOCKED_BY_POLICY |
| Rollback without rollback enablement flag | ✅ | INTENT_BLOCKED_BY_POLICY |
| ServiceNow CHG not approved | ✅ | INTENT_BLOCKED_BY_POLICY |
| M365 connector AUTH_FAILED | ✅ | Execution blocked |
| M365 connector DEGRADED | ✅ | Execution blocked |
| Cross-tenant access attempt | ✅ | 404 / empty result |
| Flexera API unavailable | ⚠️ Graceful | Trust boost skipped, execution continues |
| Missing rollback plan | ✅ | Execution blocked |
| Concurrent lock held | ✅ | INTENT_BLOCKED_BY_POLICY |

**Overall fail-closed posture: STRONG**

All mutation paths fail closed. The only path that degrades gracefully (Flexera)
is explicitly non-blocking by design — Flexera enrichment enhances confidence but
does not gate execution.
