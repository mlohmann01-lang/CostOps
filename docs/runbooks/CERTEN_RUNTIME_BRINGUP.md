# Certen Runtime Bring-Up Guide

This document describes how to bring up the Certen platform locally or in a fresh environment, from dependency installation through smoke testing.

## Prerequisites

- Node.js 18+ (native `fetch` required by smoke test)
- pnpm 8+
- PostgreSQL 14+ (running and accessible)

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/certen` | Yes |
| `JWT_SECRET` | Secret used to sign and verify session tokens | Yes |
| `ENTRA_CLIENT_ID` | Microsoft Entra (Azure AD) application client ID | M365 only |
| `ENTRA_CLIENT_SECRET` | Microsoft Entra application client secret | M365 only |
| `ENTRA_TENANT_ID` | Microsoft Entra directory (tenant) ID | M365 only |
| `ENTRA_REDIRECT_URI` | OAuth 2.0 callback URL, e.g. `http://localhost:3000/api/auth/callback` | M365 only |
| `PORT` | API server HTTP port (default: `3000`) | No |
| `LOG_LEVEL` | Pino log level: `trace`, `debug`, `info`, `warn`, `error` (default: `info`) | No |
| `NODE_ENV` | Runtime environment: `development` or `production` | No |
| `DEMO_MODE` | Set to `true` to run with synthetic demo data (disables live connector writes) | No |
| `ECON_OPS_TENANT_MODE` | Economic operations mode: `PILOT_READ_ONLY`, `PRODUCTION_RECOMMEND_ONLY`, `ENFORCED` | No |
| `M365_LIVE_LICENSE_MUTATION_ENABLED` | Set to `true` to allow real M365 license writes (default: `false`) | No |
| `M365_LIVE_LICENSE_ROLLBACK_ENABLED` | Set to `true` to allow real M365 license rollback (default: `false`) | No |
| `M365_GRAPH_MODE` | Connector mode: `MOCK_CONNECTOR` or `LIVE` (default: `MOCK_CONNECTOR`) | No |

## Local Development Setup

### 1. Install dependencies

```bash
cd /path/to/CostOps
pnpm install
```

### 2. Set environment variables

Create a `.env` file (or export variables in your shell):

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/certen_dev"
export JWT_SECRET="dev-secret-change-me-in-production"
export NODE_ENV="development"
export PORT=3000
# Optional: enable demo data
export DEMO_MODE=true
```

### 3. Build shared libraries

The API server depends on `@workspace/db` and `@workspace/api-zod`. Build them first:

```bash
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
```

## Database Migration

Certen uses Drizzle ORM with a `push` strategy (schema push, not migration files):

```bash
# Push schema to the database (creates/alters tables as needed)
pnpm migrate:db
# or directly:
pnpm --filter @workspace/db run push
```

The `DATABASE_URL` environment variable must be set before running this command.

To verify the database is reachable and required tables exist, check the readiness endpoint after starting the server:

```bash
curl http://localhost:3000/api/readiness
```

## Starting the API Server

### Development mode (build + start)

```bash
pnpm --filter @workspace/api-server run dev
```

### Production mode (after building)

```bash
# Build first
pnpm --filter @workspace/api-server run build

# Then start
pnpm --filter @workspace/api-server run start
```

The server listens on `PORT` (default `3000`). Verify it is up:

```bash
curl http://localhost:3000/api/healthz
# Expected: {"status":"ok"}
```

## Starting the Frontend (Control Plane)

The control plane is a Vite/React app. It requires `PORT` and `BASE_PATH` env vars:

```bash
export PORT=5173
export BASE_PATH=/

# Development server with hot reload
pnpm --filter @workspace/control-plane run dev

# Or build for production
pnpm --filter @workspace/control-plane run build
pnpm --filter @workspace/control-plane run serve
```

The control plane communicates with the API server. Ensure `VITE_ECONOMIC_OPERATIONS_API_BASE` is set if using a non-local API:

```bash
export VITE_ECONOMIC_OPERATIONS_API_BASE=http://localhost:3000
```

## Running the Smoke Test

With the API server running, run the smoke test:

```bash
# Against local server (default: http://localhost:3000)
pnpm smoke:certen

# Against a specific URL
BASE_URL=http://localhost:3000 pnpm smoke:certen

# With an auth token for authenticated endpoint tests
BASE_URL=http://localhost:3000 SMOKE_AUTH_TOKEN=<bearer-token> pnpm smoke:certen

# With demo mode flag
DEMO_MODE=true pnpm smoke:certen
```

See `docs/runbooks/CERTEN_SMOKE_TEST.md` for full smoke test documentation.

## Seeding Demo Data

After the database is migrated, seed demo data for local development:

```bash
# M365 customer demo data
pnpm seed:customer-demo:m365

# Golden demo data (broader dataset)
pnpm seed:golden-demo

# Execution orchestration demo
pnpm seed:orchestration-demo

# Reset the golden demo (wipe + re-seed)
pnpm reset:golden-demo
```

## Troubleshooting

### "DATABASE_URL is required"
Set `DATABASE_URL` in your shell or `.env` file before running any command that imports from `@workspace/db`.

### "Connection refused" from smoke test
The API server is not running or is not listening on `BASE_URL`. Start it with:
```bash
pnpm --filter @workspace/api-server run dev
```

### 503 from `/api/readiness`
The database is unreachable or required tables are missing. Check:
1. PostgreSQL is running and `DATABASE_URL` is correct.
2. Schema has been pushed: `pnpm migrate:db`.

### 403 from `/api/connectors`, `/api/recommendations`, `/api/governance/*`
These routes require both a valid Bearer token and a tenant context. In development (`NODE_ENV !== "production"`), the tenant context falls back to `"default"` automatically. Pass a valid `Authorization: Bearer <token>` header.

### Build artifacts missing
If the server fails to start due to missing `@workspace/db` or `@workspace/api-zod` imports:
```bash
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/api-server run build
```

### M365 connector errors
Without valid Entra credentials the connector operates in `MOCK_CONNECTOR` mode. Check `/api/health/dependencies` to see connector states:
```bash
curl http://localhost:3000/api/health/dependencies
```

## Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /api/healthz` | Liveness — always returns `{"status":"ok"}` if the process is up |
| `GET /api/health/live` | Kubernetes liveness probe — returns `{"status":"alive"}` |
| `GET /api/health/ready` | Kubernetes readiness probe — 200 if DB and config are ready, 503 otherwise |
| `GET /api/readiness` | Full readiness including DB tables and build artifacts |
| `GET /api/health/dependencies` | Status of each external dependency (postgres, m365, servicenow, flexera) |
| `GET /api/startup-report` | Detailed startup configuration report |
