# Runtime Operations Guide

## Service Startup Sequence

Start services in this order to avoid dependency failures:

```
1. PostgreSQL (verify healthy before continuing)
2. Run DB migrations: pnpm --filter @workspace/db push
3. API Server (waits for DB on health check)
4. Job Worker(s) (wait for API server health to confirm DB is up)
5. Scheduler (starts enqueueing jobs after workers are ready)
```

## Process Configuration

### API Server

```bash
NODE_ENV=production \
DATABASE_URL=postgres://... \
JWT_SECRET=<min-32-char-secret> \
ECON_OPS_TENANT_MODE=PILOT_READ_ONLY \
ALLOWED_ORIGINS=https://your-frontend.example.com \
TENANT_ISOLATION_ENABLED=true \
AUTH_REQUIRED=true \
LOG_LEVEL=info \
node dist/index.js
```

Startup validation runs automatically. The process exits non-zero if any fail-closed
condition is detected.

### Job Worker

```bash
NODE_ENV=production \
DATABASE_URL=postgres://... \
JOB_RUNNER_ENABLED=true \
JOB_WORKER_ID=worker-$(hostname)-1 \
JOB_POLL_INTERVAL_MS=5000 \
JOB_MAX_CONCURRENT=10 \
LOG_LEVEL=info \
node dist/worker.js
```

### Scheduler

```bash
NODE_ENV=production \
DATABASE_URL=postgres://... \
SCHEDULER_ENABLED=true \
JOB_POLL_INTERVAL_MS=30000 \
LOG_LEVEL=info \
node dist/scheduler.js
```

## Health Monitoring

### Primary Health Checks

| Endpoint | Purpose | Expected Response |
|---|---|---|
| `GET /health/live` | Process alive | `{"status":"alive"}` |
| `GET /health/ready` | DB + config valid | `{"ready":true,...}` |
| `GET /health/dependencies` | External connectors | Connector status map |

### Readiness Gates

`GET /health/ready` checks:
1. Database connection reachable
2. Production config valid (fail-closed conditions)
3. Required tables present

Return 503 if any check fails. Load balancers should gate traffic on this.

### Connector Health

`GET /health/dependencies` checks:
- `postgres`: Connection pool active
- `m365_graph`: Token acquisition test (read-only)
- `servicenow`: Instance URL reachable
- `flexera`: API endpoint reachable

Connector health does NOT block readiness — connectors may be degraded without
blocking the API server. Use `GET /api/economic-operations/metrics` for connector
health state in the operational context.

## Tenant Mode Management

### Viewing Current Mode

```bash
curl http://localhost:3000/api/economic-operations/command-center?tenantId=TENANT-ID \
  -H "x-role: TENANT_ADMIN" | jq '.tenantMode'
```

### Changing Tenant Mode

Tenant mode is controlled by env var `ECON_OPS_TENANT_MODE`. To change:

1. Update the env var value
2. Restart the API server with the new value
3. Verify via command center endpoint

Valid progression path:
```
PILOT_READ_ONLY
  → PILOT_APPROVAL_REQUIRED
    → PRODUCTION_APPROVAL_REQUIRED
      → PRODUCTION_GOVERNED_EXECUTION
```

Do NOT skip stages. Regress to lower modes if confidence is lost.

## Job Queue Operations

### Viewing Queue State

```bash
# All queued jobs for a tenant
curl "http://localhost:3000/api/economic-operations/jobs?tenantId=TENANT-ID&status=QUEUED" \
  -H "x-role: TENANT_ADMIN"

# All running jobs
curl "http://localhost:3000/api/economic-operations/jobs?tenantId=TENANT-ID&status=RUNNING" \
  -H "x-role: TENANT_ADMIN"

# Failed jobs
curl "http://localhost:3000/api/economic-operations/jobs?tenantId=TENANT-ID&status=FAILED" \
  -H "x-role: TENANT_ADMIN"
```

### Job Status Lifecycle

```
QUEUED → RUNNING → SUCCEEDED
QUEUED → RUNNING → RETRY_SCHEDULED → RUNNING → ... → FAILED
QUEUED → CANCELLED
RUNNING → QUEUED (stale lock expiry, worker restart)
```

### Stale Job Recovery

If a worker crashes while processing a job, the lock expires automatically after 30s
and the job returns to QUEUED state for another worker to pick up:

```bash
# Force stale lock expiry (manual recovery)
curl -X POST http://localhost:3000/api/jobs/expire-stale \
  -H "x-role: TENANT_ADMIN"
```

## Alert Management

### Viewing Alerts

```bash
# Open alerts
curl "http://localhost:3000/api/economic-operations/alerts?tenantId=TENANT-ID&status=OPEN" \
  -H "x-role: TENANT_ADMIN"
```

### Acknowledging an Alert

```bash
curl -X POST "http://localhost:3000/api/economic-operations/alerts/ALERT-ID/acknowledge" \
  -H "x-tenant-id: TENANT-ID" \
  -H "x-role: TENANT_ADMIN" \
  -H "x-user-id: operator-1" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"TENANT-ID","actorId":"operator-1"}'
```

Requires `DRIFT_ACKNOWLEDGE` permission (ECONOMIC_OPERATOR or above).

## Metrics and Observability

### Operational Metrics

```bash
curl "http://localhost:3000/api/economic-operations/metrics" \
  -H "x-role: TENANT_ADMIN"
```

Returns aggregated metrics for:
- Job completion by type and status
- Sync durations
- Execution attempts (allowed vs blocked)
- Verification outcomes
- Drift detections
- Lock contentions
- API latencies by endpoint

### Log Format

All operational logs are structured JSON:

```json
{
  "tenantId": "TENANT-ID",
  "executionId": "m365-exec-123",
  "jobId": "job-1-...",
  "action": "EXECUTE",
  "result": "ALLOWED",
  "correlationId": "corr-abc-def",
  "latencyMs": 142,
  "timestamp": "2026-05-21T08:00:00.000Z"
}
```

Correlation IDs flow: API request → job execution → Graph call → DB write.
All related log entries share the same correlationId.

## Scaling Procedures

### Horizontal Scaling (Workers)

Workers are stateless. Scale by running additional instances with unique `JOB_WORKER_ID`:

```bash
# Worker 1
JOB_WORKER_ID=worker-1 node dist/worker.js

# Worker 2 (separate process/container)
JOB_WORKER_ID=worker-2 node dist/worker.js
```

Lock contention is handled automatically — workers compete for jobs via distributed
locks. Duplicate execution is prevented.

### Connection Pool Sizing

Per API server instance: `min=2, max=20` connections.
Per job worker: `min=1, max=5` connections.
Total DB connections = (api_instances × 20) + (worker_instances × 5).

## Incident Response Quick Reference

| Symptom | First Check | Action |
|---|---|---|
| `/health/ready` returns 503 | DB connection, config validator output | Check DB, review startup logs |
| Jobs stuck in RUNNING | `lockExpiresAt` vs now | Call expire-stale endpoint |
| Connector auth failure | M365 token endpoint | Rotate client secret in vault |
| Tenant mode blocks operations | `ECON_OPS_TENANT_MODE` value | Verify env var, restart if changed |
| RBAC 403 on valid request | `x-role` header | Verify caller's role header |

See `RUNBOOK.md` for full incident response procedures.
