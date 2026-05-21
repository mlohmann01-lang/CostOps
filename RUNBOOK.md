# Operational Runbook

## Service Health Checks

### Verify API Server
```bash
curl https://<api-host>/health/live
curl https://<api-host>/health/ready
curl https://<api-host>/health/dependencies
```

Expected: all return `{ "ok": true }` or `{ "status": "alive" }`.

### Verify Database Connectivity
```bash
curl https://<api-host>/health/dependencies | jq '.dependencies[] | select(.name=="postgres")'
```

### Verify Job Queue
```bash
curl "https://<api-host>/api/economic-operations/jobs?status=QUEUED"
```

## Common Operational Procedures

### Trigger Manual Sync
```bash
# Enqueue M365 read-only sync for a tenant
curl -X POST https://<api-host>/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"TENANT-X","jobType":"M365_READ_ONLY_SYNC","jobKey":"manual-sync"}'
```

### Check Execution State
```bash
curl "https://<api-host>/api/economic-operations/executions/<executionId>/state?tenantId=<tenantId>"
curl "https://<api-host>/api/economic-operations/executions/<executionId>/timeline?tenantId=<tenantId>"
```

### View Operator Alerts
```bash
curl "https://<api-host>/api/economic-operations/alerts?tenantId=<tenantId>&status=OPEN"
```

### Acknowledge Alert
```bash
curl -X POST "https://<api-host>/api/economic-operations/alerts/<alertId>/acknowledge?tenantId=<tenantId>" \
  -H "Content-Type: application/json" \
  -d '{"actorId":"operator-id"}'
```

### Check Connector Health
```bash
curl "https://<api-host>/api/connectors?tenantId=<tenantId>"
```

## Incident Response

### Connector Auth Failure
1. Check alert feed for `CONNECTOR_DEGRADED` / `AUTH_FAILED` alerts
2. Verify credentials in secrets manager
3. Rotate Azure app secret if expired
4. Re-run health check job: `M365_CONNECTOR_HEALTH_CHECK`
5. Monitor for `HEALTHY` state restoration

### Execution Stuck in PENDING_VERIFICATION
1. Check job queue for `M365_EXECUTION_VERIFICATION` jobs
2. If job stuck in RUNNING, check lock table for expired locks
3. Run manual verification: `POST /api/economic-operations/verify/<executionId>`
4. If verification consistently fails, check Graph permissions

### Drift Detected
1. Alert category `DRIFT_DETECTED` appears in operator feed
2. Navigate to execution detail to review drift evidence
3. Acknowledge drift: submit `ACKNOWLEDGE_DRIFT` intent
4. Evaluate rollback readiness: `GET /economic-operations/rollback/<executionId>/readiness`
5. If rollback required, submit `ROLLBACK` intent with approval

### Database Connectivity Loss
1. Health endpoint `/health/ready` returns 503
2. API server will queue jobs but cannot persist state
3. Investigate DB connection: check pool exhaustion, network, credentials
4. Once restored, verify migrations: check information_schema for required tables

### Job Worker Not Processing
1. Check `JOB_RUNNER_ENABLED=true` environment variable
2. Check worker logs for `LOCK_UNAVAILABLE` errors (normal if busy)
3. Inspect stale locks: jobs in RUNNING status with expired `lock_expires_at`
4. Restart worker process to expire stale locks

### Rate Limit from M365 Graph
1. Alert: `graph_rate_limit_hit` metric spikes
2. Retry policy handles automatically with exponential backoff
3. Check `rateLimitUntil` in connector health model
4. If persistent, reduce sync frequency or request Graph throttling exemption

## Scaling Procedures

### Add Job Workers
1. Deploy new worker instance with unique `JOB_WORKER_ID`
2. Worker will automatically begin polling job queue
3. Monitor lock contention metric — should remain low

### Large Tenant Sync
1. Check sync checkpoint: `GET /api/economic-operations/metrics`
2. Sync is automatically chunked via LargeTenantSyncService
3. If sync stalls, check `sync_checkpoints` table for cursor state
4. Resume is automatic on next scheduled sync

## Maintenance Windows

### DB Migrations
1. Stop job workers (drain gracefully)
2. Run: `pnpm --filter @workspace/db push`
3. Verify tables present via `/health/ready`
4. Restart job workers
5. Verify health

### Secret Rotation
1. Update secret in secrets manager
2. Rolling restart of API server instances (zero-downtime)
3. Rolling restart of job workers
4. Verify connector health via `/health/dependencies`

## Monitoring Alerts (Operations Team)

| Alert | Severity | Action |
|-------|----------|--------|
| API error rate > 5% | HIGH | Check logs for RBAC/DB errors |
| Job queue backlog > 100 | MEDIUM | Scale workers |
| Lock contention > 10/min | MEDIUM | Check for runaway jobs |
| Connector AUTH_FAILED | HIGH | Rotate credentials |
| drift_detected count spike | HIGH | Review execution outcomes |
| DB connection pool exhausted | CRITICAL | Increase pool or DB scale |
