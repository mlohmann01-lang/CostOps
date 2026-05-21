# Deployment Topology

## Production Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION CLUSTER                         │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────────┐   │
│  │  API Server │    │  Job Worker │    │    Scheduler      │   │
│  │  (Express)  │    │  (Runner)   │    │    (Cron/Timer)   │   │
│  └──────┬──────┘    └──────┬──────┘    └────────┬──────────┘   │
│         │                  │                    │               │
│         └──────────────────┴────────────────────┘              │
│                            │                                    │
│                    ┌───────▼───────┐                           │
│                    │  PostgreSQL   │                           │
│                    │  (Primary)    │                           │
│                    └───────────────┘                           │
│                                                                 │
│  ┌─────────────────┐   ┌─────────────────┐                    │
│  │ Control Plane   │   │ Mockup Sandbox  │                    │
│  │ Frontend        │   │ (Non-Production)│                    │
│  └─────────────────┘   └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘

External Connectors (tenant-scoped, credential-vaulted):
  - Microsoft 365 Graph API
  - ServiceNow Instance
  - Flexera API

Supporting Infrastructure:
  - Secrets Manager (connector credentials, JWT secrets)
  - Telemetry Sink (structured logs, metrics)
  - Webhook/Event Dispatcher (alerts, notifications)
```

## Service Responsibilities

### API Server
- Express.js REST API
- Intent submission and lifecycle management
- Recommendation and proof graph serving
- Async job enqueueing
- RBAC enforcement on all routes
- Tenant context required on all non-health endpoints

### Job Worker
- Pulls from economic_operations_jobs queue
- Acquires distributed locks before execution
- Runs: M365 sync, verification, drift scan, health checks, notifications
- Retries with exponential backoff per retry policy
- Dead-letters failed jobs after max attempts
- Reports telemetry on job completion

### Scheduler
- Enqueues recurring jobs: sync, drift scan, readiness recheck, reconciliation
- Tenant-aware scheduling (no cross-tenant job sharing)
- Does not run jobs directly — enqueues into job table

### Database (PostgreSQL)
- All operational state is durable
- Tenant isolation via `tenant_id` on every table
- Distributed locks stored in `distributed_locks` table
- Job queue in `economic_operations_jobs` table
- Alerts in `operator_alerts` table
- Events in `operational_events` table

### Secrets Manager
- Connector credentials (Graph client secret, ServiceNow OAuth, Flexera API key)
- JWT signing secret
- Database connection string
- Never stored in environment variables in production

### Telemetry Sink
- Receives structured log events from API server and workers
- Metrics: job counts, latencies, error rates, lock contention
- Correlation IDs flow from API request → job → Graph call → ledger write

### Webhook/Event Dispatcher
- Dispatches OPERATOR_NOTIFICATION_DISPATCH jobs
- Targets: in-app alert feed, webhook placeholder, email placeholder
- All dispatches are tenant-scoped and deduplicated

## Fail-Closed Flags

| Flag | Production Default | Effect if Wrong |
|------|-------------------|----------------|
| `TENANT_ISOLATION_ENABLED` | `true` | Cross-tenant leakage |
| `DEFAULT_TENANT_FALLBACK` | `false` | Cross-tenant leakage |
| `M365_LIVE_LICENSE_MUTATION_ENABLED` | `false` | Uncontrolled mutation |
| `AUTH_REQUIRED` | `true` | Unauthenticated access |
| `DEMO_MODE` | `false` | Fixture-backed data in production |
| `DEMO_FIXTURES_ENABLED` | `false` | Non-production data exposure |
| `PREVIEW_MODE` | `false` | Incomplete feature exposure |

## Tenant Isolation Requirements

1. Every database query MUST include `WHERE tenant_id = $tenantId`
2. Every API route MUST extract and validate tenant context
3. Job workers MUST process jobs scoped to a single tenant at a time
4. Distributed locks MUST be keyed with `tenantId:resourceType:resourceId`
5. Events and alerts MUST be emitted with tenant context
6. Cross-tenant aggregation in command center is FORBIDDEN in production

## Job Worker Scaling

- Workers are stateless and horizontally scalable
- Each worker polls `economic_operations_jobs` WHERE status = 'QUEUED'
- Lock contention is handled via distributed_locks table
- Recommended: 2-5 workers per tenant cluster
- High-risk mutations (license write) have concurrency limit of 1 per user

## Migration Process

1. Build DB package: `pnpm --filter @workspace/db build`
2. Run migrations: `pnpm --filter @workspace/db push`
3. Verify tables: check for all required tables in information_schema
4. Deploy API server (zero-downtime rolling)
5. Deploy job workers
6. Verify health: `GET /health/ready`

## Rollback Process

1. Stop job workers (drain in-flight jobs gracefully)
2. Deploy previous API server version
3. Deploy previous job worker version
4. Verify health endpoints
5. If schema rollback required: apply inverse migration (test environment only)
