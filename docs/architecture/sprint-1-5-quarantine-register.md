# Sprint 1.5 — Quarantine Register

Tests quarantined here require infrastructure (Postgres) that is not available in the CI/unit-test environment. They are NOT deleted — they remain in the test suite as integration tests that must be run against a live database before promotion.

## Quarantined Tests

### approval-workflow.test.ts

- **Reason:** Directly queries `approval_requests` Postgres table via Drizzle ORM. Fails with `NodePgPreparedQuery.queryWithCache` when no database is present.
- **Root cause:** Test creates real `approval_requests` rows — it is an integration test, not a unit test.
- **Unblock:** Run against a provisioned Postgres instance with migrations applied.
- **Classification:** INTEGRATION / DB_REQUIRED

### execution-orchestration-scheduler-order.test.ts

- **Reason:** Directly queries `execution_queue_items` Postgres table via Drizzle ORM. Fails with `NodePgPreparedQuery.queryWithCache` when no database is present.
- **Root cause:** Test exercises `processExecutionOrchestrationQueueJob` which writes to the DB queue — integration test.
- **Unblock:** Run against a provisioned Postgres instance with migrations applied.
- **Classification:** INTEGRATION / DB_REQUIRED

## Baseline Outcome

| Category | Count |
|---|---|
| Tests fixed (Sprint 1.5) | 91 |
| Tests quarantined (DB_REQUIRED) | 2 |
| Tests remaining failures | 0 (excluding quarantined) |

Quarantined tests are not failures — they are correctly classified integration tests awaiting infrastructure.
