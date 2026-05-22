# Certen Smoke Test

## Purpose

The smoke test (`scripts/smoke/certen-smoke-test.ts`) is a lightweight end-to-end check that confirms a running Certen API server responds correctly across all major route groups. It validates:

- The server is reachable and healthy
- Auth-protected routes reject unauthenticated requests with 401/403 (not 500)
- Core operational routes work correctly when a valid auth token is provided
- Proof graph endpoints return the expected proof structure
- No route returns a 500 internal server error under normal conditions

The test is intentionally non-destructive: it only issues `GET` requests and reads proof/status data.

## Prerequisites

1. The Certen API server must be running and accessible (see `CERTEN_RUNTIME_BRINGUP.md`).
2. The database must be migrated and reachable by the server.
3. Node.js 18+ (native `fetch` is used — no extra packages required).
4. `tsx` must be available (it is a dev dependency in the monorepo via `pnpm`).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Base URL of the running API server |
| `SMOKE_AUTH_TOKEN` | _(none)_ | Bearer token for authenticated endpoint tests. If omitted, authenticated tests are skipped. |
| `DEMO_MODE` | _(none)_ | Set to `true` to log a note that responses may contain synthetic/demo data |

## How to Run

### Against local development server (default)

```bash
pnpm smoke:certen
```

This is equivalent to:

```bash
BASE_URL=http://localhost:3000 tsx scripts/smoke/certen-smoke-test.ts
```

### With an auth token (enables authenticated tests)

Obtain a session token from the auth flow (`GET /api/auth/login` → OAuth callback → session token), then:

```bash
SMOKE_AUTH_TOKEN=<your-bearer-token> pnpm smoke:certen
```

### Against staging

```bash
BASE_URL=https://api.staging.certen.io SMOKE_AUTH_TOKEN=<staging-token> pnpm smoke:certen
```

### Against production

```bash
BASE_URL=https://api.certen.io SMOKE_AUTH_TOKEN=<prod-read-only-token> DEMO_MODE=false pnpm smoke:certen
```

**Note:** Only use a read-only scoped token for production smoke tests. The smoke test does not issue any writes, but defence in depth is recommended.

## Expected Output (Passing)

```
[SMOKE] Target: http://localhost:3000
[SMOKE] No SMOKE_AUTH_TOKEN set — authenticated tests will be skipped

[SMOKE] --- Health checks (no auth required) ---
  ✓ GET /api/healthz returns 200 with status:ok
  ✓ GET /api/health returns 200
  ✓ GET /api/health/live returns 200 with status:alive
  ✓ GET /api/readiness returns 200 or 503 (not 500)
  ✓ GET /api/health/ready returns 200 or 503 (not 500)
  ✓ GET /api/health/dependencies returns 200 or 503 (not 500)

[SMOKE] --- Auth-protected endpoints (should reject without token) ---
  ✓ GET /api/connectors rejects without auth (401 or 403)
  ✓ GET /api/recommendations rejects without auth (401 or 403)
  ✓ GET /api/governance/policies rejects without auth (401 or 403)
  ✓ GET /api/governance/approvals rejects without auth (401 or 403)
  ...

[SMOKE] --- Core operational routes (SKIPPED — no SMOKE_AUTH_TOKEN set) ---

[SMOKE] --- Proof graph routes ---
  ✓ GET /api/economic-operations/proof/test-exec-1 returns proof structure (not 500)
  ✓ GET /api/economic-operations/proof/exec-1 uses seeded execution (not 500)
  ✓ GET /api/economic-operations/command-center returns 200 (not 500)
  ...

[SMOKE] Results: 18/18 passed
[SMOKE] All smoke tests passed.
```

Exit code is `0` on full pass.

## What to Do If Tests Fail

### "Connection refused" errors

The API server is not running. Start it:

```bash
pnpm --filter @workspace/api-server run dev
```

Then re-run the smoke test.

### Auth tests returning 200 instead of 401/403

The security guards (`requireTenantContext`, `requireCapability`) may not be running in dev mode. In `NODE_ENV=development`, the tenant context falls back to `"default"` but capability checks still apply for unauthenticated (VIEWER role) requests. Verify the middleware is wired up correctly in `artifacts/api-server/src/routes/index.ts`.

### Proof graph returning 500

The `economic-operations` router accesses the database. Ensure:
- `DATABASE_URL` is set and the database is reachable by the server.
- Tables have been created (`pnpm migrate:db`).

### Authenticated tests failing with 403

The provided `SMOKE_AUTH_TOKEN` may be expired or map to a role without the required capability. Check `/api/auth/me` with the token:

```bash
curl -H "Authorization: Bearer $SMOKE_AUTH_TOKEN" http://localhost:3000/api/auth/me
```

The `role` field must be one of: `PLATFORM_ADMIN`, `TENANT_ADMIN`, `OPERATOR`, `APPROVER`, or `VIEWER`. `VIEWER` has read-only capabilities; `TENANT_ADMIN` or `PLATFORM_ADMIN` will pass all capability checks.

## Test Coverage Description

| Test Group | What it validates |
|------------|------------------|
| Health checks | Liveness (`/healthz`, `/health/live`), readiness (`/readiness`, `/health/ready`), dependency status (`/health/dependencies`). None require auth. |
| Auth rejection | `/api/connectors`, `/api/recommendations`, `/api/governance/policies`, `/api/governance/approvals` must all reject with 401 or 403 when no Bearer token is supplied. This guards against accidentally open routes. |
| Authenticated core routes | With a valid token: connectors list, recommendations list, execution list, governance policies and approvals, outcomes list and summary. All must return 200 and must not return 500. |
| Proof graph | `GET /api/economic-operations/proof/:id` must return a JSON body with `status` equal to `PROOF_INCOMPLETE` or `PROOF_COMPLETE` — never a 500. The seeded execution (`exec-1`) exercises the in-memory proof graph. |
| Command center / metrics / alerts / jobs | These economic-operations sub-routes are open (no capability guard) and must return 200. |
| Verification routes | `/api/verification/outcomes` accepts an optional auth token and returns 200 (with auth) or 401/403 (without). Never 500. |
| Miscellaneous | `/api/auth/me` (returns null context without token), `/api/drift`, `/api/packs`, `/api/demo/status`, `/api/execution-orchestration/observability`. |

## Running in CI

Add to your CI pipeline after starting the API server:

```yaml
- name: Start API server (background)
  run: |
    DATABASE_URL=${{ secrets.DATABASE_URL }} \
    JWT_SECRET=${{ secrets.JWT_SECRET }} \
    NODE_ENV=production \
    pnpm --filter @workspace/api-server run start &
    # Wait for server to be ready
    timeout 30 bash -c 'until curl -sf http://localhost:3000/api/healthz; do sleep 1; done'

- name: Run smoke tests
  run: |
    BASE_URL=http://localhost:3000 \
    SMOKE_AUTH_TOKEN=${{ secrets.CI_SMOKE_TOKEN }} \
    pnpm smoke:certen
```
