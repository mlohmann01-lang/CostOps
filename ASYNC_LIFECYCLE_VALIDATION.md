# Async Lifecycle Validation

## Overview

This document validates that the full operational lifecycle runs correctly in an
async, distributed manner — outside the HTTP request/response cycle.

## Lifecycle State Machine

```
PROPOSED
  ↓ SIMULATE
SIMULATED
  ↓ REQUEST_APPROVAL
APPROVAL_REQUIRED
  ↓ APPROVE
APPROVED
  ↓ EXECUTE (live enabled) or blocked → EXECUTION_READY_NOT_LIVE_ENABLED
EXECUTED
  ↓ async: VERIFY (job-driven)
VERIFIED
  ↓ async: DRIFT_SCAN (scheduled)
DRIFT_DETECTED (if drift found)
  ↓ ACKNOWLEDGE_DRIFT
DRIFT_DETECTED (acknowledged)
  ↓ ROLLBACK (optional)
ROLLED_BACK
```

Terminal states: `VERIFIED`, `ROLLED_BACK`, `BLOCKED`, `MANUAL_ONLY`

## Async Separation Points

| Step | Trigger | How |
|---|---|---|
| Sync (discover users) | Scheduled or manual | `M365_READ_ONLY_SYNC` job |
| Recommendation generation | After sync completes | `M365_RECOMMENDATION_GENERATE` job |
| Execution | Intent submitted via API | Direct (in request for live execution) |
| Verification | After live execution | `M365_EXECUTION_VERIFY` job, enqueued after execute |
| Drift scan | Scheduled (recurring) | `M365_DRIFT_SCAN` job, enqueued by scheduler |
| Notification dispatch | After state change | `OPERATOR_NOTIFICATION_DISPATCH` job |
| ServiceNow change | After approval granted | `SERVICENOW_CHANGE_CREATE` job |

## Validation: Sync Runs Outside Request Cycle

Sync is enqueued as a job, not executed inline:

```typescript
// API handler enqueues, does NOT run sync
const { jobId } = globalJobScheduler.enqueue({
  tenantId,
  jobType: 'M365_READ_ONLY_SYNC',
  jobKey: `sync:${tenantId}`,
  payload: { tenantId },
});
// Returns immediately, job runs on worker
```

**Validation**: Call the sync endpoint and verify the HTTP response returns in < 100ms
with a jobId, while the job itself runs on the worker process.

## Validation: Verification Runs Asynchronously

After live execution, verification is NOT inline in the HTTP response. Instead:

```
POST /intent { intentType: "EXECUTE" }
→ Execution recorded
→ EXECUTION_READY_NOT_LIVE_ENABLED (if live flag off)
   OR
→ Live mutation submitted to Graph
→ HTTP response: { liveExecution: { status: "LIVE_EXECUTION_SUBMITTED" } }
→ Job enqueued: M365_EXECUTION_VERIFY (scheduled for T+30min propagation window)

---
(30 minutes later, on worker)
POST /verify/:executionId
→ Graph API call: verify user disabled, licenses removed
→ Verification event written
→ Outcome ledger updated
→ verificationStatus: VERIFIED or FAILED_VERIFICATION
```

The `/verify/:executionId` endpoint can also be called manually (HTTP POST) for
immediate verification regardless of the job schedule.

## Validation: Drift Scan Runs on Schedule

```
Scheduler tick (every N minutes):
→ For each tenant in PILOT or PRODUCTION mode:
   → Enqueue M365_DRIFT_SCAN for each executed recommendation
   
Worker processes M365_DRIFT_SCAN:
→ GET user from Graph (account status, license assignments)
→ Compare with expected post-execution state
→ If mismatch: emit DRIFT_DETECTED event → create alert
→ Insert into economic_operations_drift_events
```

## Validation: Timeline API Shows Async Steps

The timeline endpoint aggregates all async events:

```bash
curl "http://localhost:3000/api/economic-operations/executions/<executionId>/timeline?tenantId=TENANT-SMOKE"
```

Response structure:
```json
{
  "executionId": "m365-exec-123",
  "tenantId": "TENANT-SMOKE",
  "currentState": { "currentState": "VERIFIED", ... },
  "timeline": {
    "actions": [
      { "action": "SIMULATE", "actor": "op-1", "timestamp": "..." },
      { "action": "APPROVE",  "actor": "approver-1", "timestamp": "..." },
      { "action": "EXECUTE",  "actor": "op-1", "timestamp": "..." }
    ],
    "verifications": [
      { "verificationStatus": "VERIFIED", "timestamp": "..." }
    ],
    "drift": [],
    "events": [
      { "type": "EXECUTION_SUCCEEDED", "timestamp": "..." }
    ]
  }
}
```

## Retry Behavior Validation

| Scenario | Expected Behavior |
|---|---|
| M365 API returns 429 (rate limited) | Retry after `Retry-After` header (or 60s) |
| Network timeout | Retry with exponential backoff (2s, 4s, 8s...) |
| 5xx from Graph | Retry up to maxAttempts |
| 401 (auth failed) | Do NOT retry — dead letter immediately |
| 403 (scope missing) | Do NOT retry — create AUTH_FAILED alert |
| Tenant mode violation | Do NOT retry — operational policy block |

The retry decision is made by `classifyError()` in `economic-operations-retry-policy.ts`.
Non-retryable errors use `deadLetter: true`, which causes immediate FAILED status.

## Expected State Transitions for Non-Live Smoke Test

```
State sequence for PILOT_READ_ONLY, M365_LIVE_LICENSE_MUTATION_ENABLED=false:

PROPOSED
  → SIMULATE intent → SIMULATED
  → REQUEST_APPROVAL intent → APPROVAL_REQUIRED
  → APPROVE intent → APPROVED
  → EXECUTE intent → state not changed (blocked: EXECUTION_READY_NOT_LIVE_ENABLED)
  
Verification:
  → POST /verify → FAILED_VERIFICATION (reason: NO_LIVE_EXECUTION_EVIDENCE)
  
Drift:
  → No drift events (no live execution)
  
Rollback readiness:
  → ROLLBACK_BLOCKED (no execution to roll back)
```

## Recovery Behavior After Worker Restart

```
Scenario: Worker processes job, crashes before writing SUCCEEDED

1. Job is RUNNING, lockExpiresAt = T+30s
2. Worker crashes
3. T+30s passes
4. Next scheduler tick: expireStaleJobs() runs
5. Job returns to QUEUED (lockExpiresAt expired)
6. Any available worker picks up job
7. Job runs from the start (idempotent job handlers)
```

**Idempotency requirement**: All job handlers must be idempotent. Running the same
job twice must produce the same outcome without side effects. The sync job achieves
this via upsert operations. The verification job is idempotent via the verification
event deduplication.

## Concurrency Control Validation

```
Scenario: Two workers both try to run the same job

Worker A: markRunning("job-1", "worker-a") → true  (lock acquired)
Worker B: markRunning("job-1", "worker-b") → false (lock already held)

Worker A completes → markSucceeded("job-1", result)
Worker B should not attempt the same job again (getQueuedJobs() would not return it)
```

Both workers poll `getQueuedJobs()` which returns only QUEUED jobs with
`scheduledAt <= now`. A RUNNING or SUCCEEDED job is never returned.
