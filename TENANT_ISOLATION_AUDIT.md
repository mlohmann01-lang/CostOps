# Tenant Isolation Audit

## Audit Methodology

Each data access path was reviewed to confirm `tenantId` is enforced at the
query level. Cross-tenant reads, writes, and aggregations are all forbidden
in production.

## Database Table Audit

| Table | tenant_id Column | Query Enforcement | Status |
|---|---|---|---|
| `recommendations` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `outcome_ledger` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `economic_operations_action_history` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `economic_operations_execution_state` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `economic_operations_idempotency` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1 AND execution_id = $2` | ✅ |
| `economic_operations_verification_events` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `economic_operations_drift_events` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `economic_operations_rollback_events` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `economic_operations_jobs` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `distributed_locks` | ✅ `tenant_id TEXT NOT NULL` | Lock key includes tenantId prefix | ✅ |
| `sync_checkpoints` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |
| `operator_alerts` | ✅ `tenant_id TEXT NOT NULL` | `getAlerts(tenantId)` | ✅ |
| `econ_ops_events` | ✅ `tenant_id TEXT NOT NULL` | `getEvents(tenantId)` | ✅ |
| `connector_health_model` | ✅ `tenant_id TEXT NOT NULL` | `WHERE tenant_id = $1` | ✅ |

## In-Memory Service Audit

All in-memory services (used during tests and warm paths) enforce tenant isolation:

### EconomicOperationsIntentService

```typescript
// Intent submission: verified against execution record by tenantId
const execution = this.executions.get(`${intent.tenantId}:${intent.executionId}`);
if (!execution) return reject('INTENT_REJECTED', ...);

// Action history keyed by tenantId:executionId
this.actions.get(`${intent.tenantId}:${intent.executionId}`)

// getActions requires both tenantId and executionId
svc.getActions('TENANT-B', 'e1') // Returns [] if e1 belongs to TENANT-A
```

### EconomicOperationsJobScheduler

```typescript
// queryJobs filters by tenantId
queryJobs({ tenantId: 'TENANT-A' })
// Returns only jobs where job.tenantId === 'TENANT-A'
```

### DistributedLockService

```typescript
// Lock keys include tenantId: "TENANT-A:m365:user:user-1:EXECUTION"
const keyA = buildM365ExecutionKey('TENANT-A', 'user-1');
const keyB = buildM365ExecutionKey('TENANT-B', 'user-1');
// keyA !== keyB → no lock conflict between tenants
```

### OperationalEventsService

```typescript
// Events stored and retrieved with tenantId
getEvents('TENANT-A') // Returns only events where event.tenantId === 'TENANT-A'
getAlerts('TENANT-A') // Returns only alerts where alert.tenantId === 'TENANT-A'
acknowledgeAlert(alertId, 'TENANT-B', actorId) // Returns false if alert belongs to TENANT-A
```

## API Route Audit

| Route | Tenant Source | Isolation |
|---|---|---|
| `GET /command-center?tenantId=` | Query param | `WHERE tenant_id = tenantId` |
| `POST /intent` (body.tenantId) | Request body | Execution lookup by `tenantId:executionId` |
| `GET /actions/:executionId?tenantId=` | Query param | `AND tenant_id = tenantId` |
| `GET /executions/:id/state?tenantId=` | Query param | `AND tenant_id = tenantId` |
| `GET /proof/:executionId?tenantId=` | Query param | Record lookup by tenantId |
| `GET /jobs?tenantId=` | Query param | `queryJobs({ tenantId })` |
| `GET /alerts?tenantId=` | Query param | `getAlerts(tenantId)` |
| `POST /alerts/:id/acknowledge` | Header/body | `acknowledgeAlert(id, tenantId, actor)` |
| `GET /executions/:id/timeline?tenantId=` | Query param | All sub-queries scoped |

## Cross-Tenant Attack Scenarios

### Scenario 1: TENANT-B reads TENANT-A's execution

```
GET /executions/m365-exec-123/state?tenantId=TENANT-B
→ DB query: WHERE tenant_id = 'TENANT-B' AND execution_id = 'm365-exec-123'
→ Result: NOT_FOUND (execution belongs to TENANT-A)
→ HTTP 404
```

### Scenario 2: TENANT-B submits intent for TENANT-A's execution

```
POST /intent { tenantId: "TENANT-B", executionId: "m365-exec-123-owned-by-A" }
→ execution = this.executions.get("TENANT-B:m365-exec-123-owned-by-A")
→ Result: undefined
→ return reject('INTENT_REJECTED', ...)
→ HTTP 200 { accepted: false, reason: "INTENT_REJECTED" }
```

### Scenario 3: TENANT-B acquires lock on TENANT-A's resource

```
lockSvc.acquireLock({ tenantId: "TENANT-A", resourceType: "m365:user", resourceId: "user-1" })
→ key: "TENANT-A:m365:user:user-1:EXECUTION"

lockSvc.acquireLock({ tenantId: "TENANT-B", resourceType: "m365:user", resourceId: "user-1" })
→ key: "TENANT-B:m365:user:user-1:EXECUTION"

// Different keys → no conflict → both acquire successfully
```

### Scenario 4: Cross-tenant job query

```
scheduler.queryJobs({ tenantId: "TENANT-B" })
→ Returns only jobs where job.tenantId === "TENANT-B"
→ TENANT-A jobs not included
```

## Production Guards

| Guard | Location | Enforces |
|---|---|---|
| `TENANT_ISOLATION_ENABLED=true` | Config validator | Fail-closed if disabled |
| `DEFAULT_TENANT_FALLBACK=false` | Config validator | No default tenant in production |
| `requireTenantContext()` | `security-guards.ts` | Returns 400 if no tenant context |
| `tenantId` in RBAC check | `extractOperatorActor` | RBAC linked to tenant |

## Audit Conclusion

All 14 database tables have `tenant_id` columns enforced at query level.
All in-memory services filter by `tenantId`.
Cross-tenant attack scenarios are blocked by design.
Production config validator fails if tenant isolation is disabled.

**Isolation posture: STRONG**

No cross-tenant data leakage paths identified in this audit.
