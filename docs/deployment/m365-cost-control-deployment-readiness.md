# M365 Cost Control — Deployment Readiness Runbook

## Required Services
- PostgreSQL (required runtime dependency).
- API server (`@workspace/api-server`).
- Control plane UI (`@workspace/control-plane`) for demo visualization.

## Required Environment Variables
- `DATABASE_URL` (required; runtime and migration access).
- `NODE_ENV` (`production` for deployment, `development` for local debug).
- `DEMO_MODE=true` (required for demo seed/runtime).
- Auth variables (if enabled by environment): token/JWT provider values configured for API auth middleware.

## Database Setup
1. Provision a PostgreSQL instance.
2. Set `DATABASE_URL`.
3. Build DB package: `pnpm --filter @workspace/db build`.
4. Push schema: `pnpm --filter @workspace/db run push`.

## Schema Push / Migration
- Current flow uses Drizzle schema push.
- For forced sync in non-production recovery only: `pnpm --filter @workspace/db run push-force`.

## Seed Commands
- Orchestration demo seed: `pnpm run seed:orchestration-demo`.
- Customer demo M365 seed (demo-mode only): `pnpm run seed:customer-demo:m365`.

## Startup Commands
- Build workspace: `pnpm run build`.
- Start API server: `pnpm --filter @workspace/api-server run start`.
- Start control plane (if serving separately): use control-plane deployment target start command.

## Validation Commands
- Build artifacts:
  - `pnpm --filter @workspace/db build`
  - `pnpm --filter @workspace/api-zod build`
  - `pnpm --filter @workspace/api-client-react build`
- Runtime validation script:
  - `pnpm run validate:runtime-env`
- Demo smoke script:
  - `pnpm run smoke:m365-demo`

## Rollback Plan
1. Stop API deployment.
2. Roll back to previous known-good image/tag.
3. Restore DB snapshot if schema/data regression occurred.
4. Re-run readiness check `/api/health/readiness` and smoke checks.

## Known Limitations
- Runtime validation and readiness DB checks are DB-dependent.
- In environments without Postgres, compile/typecheck can pass while runtime validators fail.

## Demo Mode Restrictions
- `DEMO_MODE=true` is mandatory for customer demo seed.
- Seed script refuses execution when demo mode is not explicitly true.
- Demo seed logs: `demo mode only — no external execution`.
- Demo runtime scripts are read-only and do not trigger execution endpoints.
