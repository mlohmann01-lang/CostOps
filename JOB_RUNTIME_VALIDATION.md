# Job Runtime Validation

## Overview

This document demonstrates that async jobs actually run outside the request/response
lifecycle and validates retry, lock, and recovery behaviors.

## Job Type Registry

The platform supports 10 job types:

| Job Type | Description | High Risk | Requires Lock | Max Concurrency |
|---|---|---|---|---|
| `M365_READ_ONLY_SYNC` | Sync M365 user/license data | No | Yes | Per registry |
| `M365_RECOMMENDATION_GENERATE` | Generate reclaim recommendations | No | No | Per registry |
| `M365_EXECUTION_VERIFY` | Verify license removal outcome | No | Yes | Per registry |
| `M365_DRIFT_SCAN` | Scan for configuration drift | No | No | Per registry |
| `M365_ROLLBACK_EXECUTE` | Execute rollback reassignment | Yes | Yes | 1 per high-risk |
| `SERVICENOW_CHANGE_CREATE` | Create ServiceNow change request | No | No | Per registry |
| `FLEXERA_ENTITLEMENT_SYNC` | Sync Flexera entitlement data | No | Yes | Per registry |
| `CONNECTOR_HEALTH_CHECK` | Check connector auth/health | No | No | Per registry |
| `OPERATOR_NOTIFICATION_DISPATCH` | Dispatch operator notifications | No | No | Per registry |
| `RECOMMENDATION_ARBITRATION` | Run recommendation arbitration | No | No | Per registry |

## Validation Scenario 1 — Sync Job Lifecycle

**Test**: Enqueue a sync job and verify it transitions through QUEUED → RUNNING → SUCCEEDED

```bash
# 1. Enqueue via job scheduler API
curl -X POST http://localhost:3000/api/economic-operations/jobs/enqueue \
  -H "x-tenant-id: TENANT-SMOKE" \
  -H "x-role: TENANT_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "TENANT-SMOKE",
    "jobType": "M365_READ_ONLY_SYNC",
    "jobKey": "sync:TENANT-SMOKE",
    "payload": {"tenantId": "TENANT-SMOKE"}
  }'

# 2. Verify job is QUEUED
curl "http://localhost:3000/api/economic-operations/jobs?tenantId=TENANT-SMOKE&status=QUEUED"

# 3. Job runner polls and picks it up (status changes to RUNNING)
# 4. Job completes (status changes to SUCCEEDED)

# 5. Verify final state
curl "http://localhost:3000/api/economic-operations/jobs/<jobId>"
```

**Expected states in order:** QUEUED → RUNNING → SUCCEEDED

## Validation Scenario 2 — Deduplication

**Test**: Enqueue the same job twice — second enqueue should be deduplicated

```bash
curl -X POST http://localhost:3000/api/economic-operations/jobs/enqueue \
  -d '{"tenantId":"T1","jobType":"M365_READ_ONLY_SYNC","jobKey":"sync:T1","payload":{}}'
# Response: {"jobId":"job-1-...", "deduplicated":false}

curl -X POST http://localhost:3000/api/economic-operations/jobs/enqueue \
  -d '{"tenantId":"T1","jobType":"M365_READ_ONLY_SYNC","jobKey":"sync:T1","payload":{}}'
# Response: {"jobId":"job-1-...", "deduplicated":true}  ← same jobId
```

Deduplication keys:
1. `idempotencyKey` (explicit, if provided)
2. `tenantId:jobKey:jobType` (implicit, for same-job protection)

## Validation Scenario 3 — Retry on Failure

**Test**: Job fails on first attempt, retries with exponential backoff

Expected retry behavior:
- Attempt 1 fails → status `RETRY_SCHEDULED`, scheduledAt = now + 2s (2^1 * 1000ms)
- Attempt 2 fails → status `RETRY_SCHEDULED`, scheduledAt = now + 4s (2^2 * 1000ms)
- Attempt 3 fails → status `RETRY_SCHEDULED`, scheduledAt = now + 8s
- Attempt N (maxAttempts) fails → status `FAILED` (dead letter)

Max delay cap: 60 seconds (even with high attempt counts).

To inspect retry state:
```bash
curl "http://localhost:3000/api/economic-operations/jobs?tenantId=T1&status=RETRY_SCHEDULED"
```

## Validation Scenario 4 — Distributed Lock Acquisition

**Test**: Two workers compete for the same job — only one wins the lock

```
Worker A:  markRunning(jobId, "worker-a") → true  (acquires lock)
Worker B:  markRunning(jobId, "worker-b") → false (lock held by worker-a)
```

The `lockedBy` field on the job record identifies the lock holder.
`lockExpiresAt` is set to now + 30s for each lock acquisition.

Lock contention is tracked in telemetry:
```bash
curl http://localhost:3000/api/economic-operations/metrics \
  | jq '.metrics[] | select(.name == "lock_contention")'
```

## Validation Scenario 5 — Stale Lock Recovery (Worker Restart)

**Test**: Worker crashes mid-job; job returns to QUEUED after lock expiry

```
1. Worker A acquires lock (lockExpiresAt = now + 30s)
2. Worker A crashes
3. 30s pass (lockExpiresAt < now)
4. expireStaleJobs() runs (called on scheduler tick)
5. Job returns to QUEUED with lockedBy = undefined
6. Worker B picks up job
```

To trigger manual stale expiry:
```typescript
const count = globalJobScheduler.expireStaleJobs();
// count = number of jobs returned to QUEUED
```

## Validation Scenario 6 — Concurrency Limits

**Test**: High-risk job respects concurrency limit of 1

The `EconomicOperationsJobRunner` enforces:
- `tenantMax`: max concurrent jobs per tenant
- `providerMax`: max concurrent jobs per provider (m365)
- `actionClassMax`: max concurrent jobs per action class
- `highRiskLimit`: max 1 concurrent high-risk job per tenant

For `M365_ROLLBACK_EXECUTE` (`isHighRisk: true`):
```
If one rollback is already RUNNING for TENANT-A:
→ Second rollback for TENANT-A will not start until first completes
```

## Validation Scenario 7 — Dead Letter (Max Attempts Exhausted)

When a job fails `maxAttempts` times, it transitions to `FAILED` (dead letter):

```bash
# View dead-letter jobs
curl "http://localhost:3000/api/economic-operations/jobs?tenantId=T1&status=FAILED"
```

Dead-letter jobs include:
- `lastError`: error message from final failure
- `failedAt`: timestamp of final failure
- `attemptCount`: number of attempts made

Dead-letter jobs require manual investigation and replay. They are NOT automatically
re-enqueued to prevent runaway failure loops.

## Job Queue Health Indicators

| Metric | Healthy | Warning | Critical |
|---|---|---|---|
| QUEUED jobs (no worker running) | 0 | > 10 for > 5min | > 50 for > 5min |
| RUNNING jobs older than 10min | 0 | 1-2 | > 2 |
| FAILED jobs per hour | 0 | 1-5 | > 10 |
| RETRY_SCHEDULED jobs | 0-3 | 4-10 | > 10 |

Alert thresholds should trigger `CONNECTOR_HEALTH` or `JOB_STUCK` alert categories
in the operational events service.

## Log Verification

Each job completion writes a structured log:
```json
{
  "tenantId": "TENANT-SMOKE",
  "jobId": "job-1-1234567890",
  "action": "JOB_COMPLETED",
  "result": "SUCCEEDED",
  "correlationId": "corr-...",
  "latencyMs": 2341,
  "timestamp": "2026-05-21T08:00:00Z"
}
```

Verify logs flow correctly:
```bash
# Start API server with debug logging
LOG_LEVEL=debug node dist/index.js 2>&1 | jq 'select(.action == "JOB_COMPLETED")'
```
