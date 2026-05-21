# Production Environment Configuration

## Required Environment Variables

### Core
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | YES | PostgreSQL connection string |
| `NODE_ENV` | YES | Must be `production` in prod |
| `JWT_SECRET` | YES | Min 32 chars, high-entropy secret |
| `ALLOWED_ORIGINS` | YES | Comma-separated allowed CORS origins (no wildcard) |

### Tenant Control
| Variable | Required | Description |
|----------|----------|-------------|
| `ECON_OPS_TENANT_MODE` | YES | One of: DEMO, PILOT_READ_ONLY, PILOT_APPROVAL_REQUIRED, PRODUCTION_RECOMMEND_ONLY, PRODUCTION_APPROVAL_REQUIRED, PRODUCTION_GOVERNED_EXECUTION, PRODUCTION_LOCKED |
| `TENANT_ISOLATION_ENABLED` | YES | Must be `true` in production |
| `DEFAULT_TENANT_FALLBACK` | MUST BE FALSE | If `true`, fails startup in production |
| `AUTH_REQUIRED` | YES | Must be `true` in production |

### M365 Connector
| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_TENANT_ID` | YES (live) | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | YES (live) | App registration client ID |
| `AZURE_CLIENT_SECRET` | YES (live) | App registration secret (from vault) |
| `M365_GRAPH_GRANTED_PERMISSIONS` | YES | Space-separated granted scopes |
| `M365_LIVE_LICENSE_MUTATION_ENABLED` | Controlled | `true` only with PRODUCTION_GOVERNED_EXECUTION mode |
| `M365_LIVE_LICENSE_ROLLBACK_ENABLED` | Controlled | `true` only with rollback approval policy |
| `M365_GRAPH_MODE` | Optional | `MOCK_CONNECTOR` for non-live environments |

### ServiceNow Connector
| Variable | Required | Description |
|----------|----------|-------------|
| `SERVICENOW_INSTANCE_URL` | YES (live) | `https://<instance>.service-now.com` |
| `SERVICENOW_CLIENT_ID` | YES (live) | OAuth client ID |
| `SERVICENOW_CLIENT_SECRET` | YES (live) | OAuth secret (from vault) |
| `SERVICENOW_MODE` | Optional | `MOCK_CONNECTOR` for non-live |

### Flexera Connector
| Variable | Required | Description |
|----------|----------|-------------|
| `FLEXERA_BASE_URL` | YES (live) | Flexera API base URL |
| `FLEXERA_API_KEY` | YES (live) | API key (from vault) |
| `FLEXERA_MODE` | Optional | `MOCK_CONNECTOR` for non-live |

### Job Scheduler / Worker
| Variable | Required | Description |
|----------|----------|-------------|
| `SCHEDULER_ENABLED` | YES (prod) | Enable background scheduler |
| `JOB_RUNNER_ENABLED` | YES (prod) | Enable job worker polling |
| `JOB_WORKER_ID` | YES (worker) | Unique worker identifier per instance |
| `JOB_POLL_INTERVAL_MS` | Optional | Default: 5000 |
| `JOB_MAX_CONCURRENT` | Optional | Default: 10 per worker |

### Observability
| Variable | Required | Description |
|----------|----------|-------------|
| `LOG_LEVEL` | Optional | `info` in production, `debug` in development |
| `TELEMETRY_ENDPOINT` | Optional | OpenTelemetry collector endpoint |
| `METRICS_ENABLED` | Optional | Enable metrics emission |

### Security (Fail-Closed)
| Variable | Forbidden Value | Reason |
|----------|----------------|--------|
| `DEMO_MODE` | `true` | Non-live fixture data |
| `DEMO_FIXTURES_ENABLED` | `true` | Non-production data |
| `PREVIEW_MODE` | `true` | Incomplete features |
| `DEFAULT_TENANT_FALLBACK` | `true` | Cross-tenant leakage |
| `ALLOWED_ORIGINS` | `*` | Unsafe CORS |

## Startup Validation

On startup, the production config validator runs automatically.
If any fail-closed condition is detected, the service refuses to start
with a clear error message listing all violations.

To validate manually:
```bash
NODE_ENV=production node -e "import('./src/lib/config/production-config-validator.js').then(m => m.assertProductionConfigSafe())"
```

## Health Check Endpoints

```
GET /health/live     → 200 if process is alive
GET /health/ready    → 200 if DB connected and config valid
GET /health/dependencies → 200 if all external dependencies reachable
GET /readiness       → Legacy readiness check (still supported)
GET /healthz         → Simple health check
```

## Database Requirements

PostgreSQL 14+ required.

Required extensions: none (standard pg).

Connection pool: min 2, max 20 connections per API server instance.

All tables require `tenant_id` column. Queries without tenant scope will
be rejected by application-level tenant isolation guards.
