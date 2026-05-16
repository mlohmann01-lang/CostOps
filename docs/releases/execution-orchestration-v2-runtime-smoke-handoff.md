# Execution Orchestration V2 — External Runtime Smoke Handoff (Checkpoint 12D)

## Why this handoff exists
DB-backed smoke validation cannot be completed in the current container environment because:
- Docker is unavailable (`docker: command not found`).
- No local Postgres service is reachable.
- `DATABASE_URL` points to `localhost:5432` but connection attempts fail with `ECONNREFUSED`.
- As a result, DB schema push and demo seed fail correctly in this container.

This handoff is for Replit/local dev/CI/any environment with reachable Postgres.

## Required environment
- Node + pnpm workspace environment (same repo setup as normal development).
- Reachable disposable/test Postgres database.
- `DATABASE_URL` exported in shell or `.env` for all commands below.

## DATABASE_URL requirement
Use a disposable dev/test DB only.

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/costops_dev
```

## Exact command sequence
Run commands in this exact order:

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/costops_dev

pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/db build
pnpm --filter @workspace/db typecheck
pnpm --filter @workspace/db push

pnpm --filter @workspace/api-server typecheck

pnpm --filter @workspace/api-server test -- execution-orchestration-batch-automation.test.ts execution-orchestration-scheduler-order.test.ts execution-orchestration-operator-actions.test.ts execution-orchestration-operational-controls.test.ts execution-orchestration-processor.test.ts execution-orchestration-v2.test.ts

pnpm seed:orchestration-demo
pnpm dev
```

## Expected results
- DB build/typecheck pass.
- DB push succeeds and orchestration tables are present.
- API-server typecheck passes.
- Focused orchestration tests pass.
- Seed inserts demo orchestration records without outbound execution activity.
- Dev stack starts with API server + control-plane connected to DB.

## Manual UI validation checklist
Navigate to `/execution-orchestration` and confirm:
- overview metrics render
- plans table renders
- plan detail renders
- queue item detail renders
- batch panel renders
- automation candidate panel renders
- evidence timeline renders
- escalation panel renders
- promotion evidence drawer renders

## Seeded data validation checklist
Confirm seeded demo records are visible:
- READY plan
- WAITING_DEPENDENCIES plan
- BLOCKED item
- HIGH blast-radius batch
- READY_FOR_REVIEW automation candidate
- revoked automation candidate
- SLA breach escalation

## Safety validation (required explicit confirmations)
Record explicit pass/fail for each:
- No Graph calls during seed
- No execution-engine calls during seed
- No outbound connector calls during seed
- No force-execute UI action present
- Unsafe auto-safe action is hidden
- Blocked/quarantined states are visually distinct
- Runtime/governance preservation copy is visible in UI

## Observability validation
Call:
- `GET /execution-orchestration/observability/summary`

Verify response includes all keys:
- `activePlans`
- `readyItems`
- `runningItems`
- `blockedItems`
- `quarantinedItems`
- `openEscalations`
- `slaBreaches`
- `activeBatches`
- `automationCandidatesReadyForReview`
- `autoSafeApprovedCandidates`
- `recentFailures`
- `recentRuntimeBlocks`
- `recentDemotions`
- `oldestReadyItemAgeMinutes`

Confirm overview UI reflects the same metrics.

## Scheduler validation
Invoke `processExecutionOrchestrationQueueJob` through existing job runner/local invocation.

Verify phases execute in order:
1. release expired locks
2. dependency evaluation
3. SLA evaluation
4. batch readiness
5. automation candidate evaluation
6. queue processing
7. summary telemetry

Critical safety checks during scheduler run:
- No duplicate queue execution
- No runtime control bypass
- No approval bypass
- No Graph calls
- No execution-engine activity from demo records

## Failure diagnostics
If smoke fails, capture:
- full command + timestamp
- stderr/stdout snippets
- DB connectivity errors (`ECONNREFUSED`, auth, TLS, DNS)
- schema push output
- seed output and first failing insert
- API logs around orchestration routes/jobs
- UI console/network errors
- observability endpoint payload/body/status

## Final sign-off checklist
Mark complete only when all are true:
- [ ] Postgres reachable via `DATABASE_URL`
- [ ] DB build/typecheck/push succeed
- [ ] Demo seed completes successfully
- [ ] UI surfaces render at `/execution-orchestration`
- [ ] Seeded records are visible
- [ ] Safety validations pass
- [ ] Observability summary endpoint returns expected keys
- [ ] Scheduler phases execute in required order
- [ ] Operator actions work with valid transitions
- [ ] No unsafe execution paths observed
