# API Server Test Harness Baseline

Date: 2026-06-17
Command: `pnpm --filter @workspace/api-server run test`

## Environment assumptions

- Default API-server unit/regression test command must not require local Postgres or any external service.
- Database integration coverage is explicit opt-in via `RUN_DB_INTEGRATION_TESTS=true`.
- Tests must resolve repository, package, and source paths from workspace markers rather than bundled `import.meta.url` or absolute local paths.

## Failure inventory

| Failure | Classification | Fix/quarantine decision | Re-enable condition | Owner/module |
| --- | --- | --- | --- | --- |
| `approval-workflow.test.ts` attempted to connect to `localhost:5432` and failed with `ECONNREFUSED`. | ENVIRONMENT_GAP / DATABASE_INTEGRATION_TEST | Classified as DB integration and gated from the default runner. The runner reports `Skipped DB integration test: RUN_DB_INTEGRATION_TESTS not set (...)` instead of failing silently. | Run with `RUN_DB_INTEGRATION_TESTS=true` and a reachable `DATABASE_URL`/local Postgres. | Governance approval workflow / DB persistence |
| DB-backed persistence and route workflow tests import `@workspace/db` or DB-backed routes and fail without `DATABASE_URL`/Postgres (`connector-readiness-persistence`, `live-tenant-readiness-persistence`, `m365-beta-e2e-fixture`, `outcome-finance-reconciliation-persistence`, `approval-workflow-execution-request`). | ENVIRONMENT_GAP / DATABASE_INTEGRATION_TEST | Classified as DB integration and gated from the default runner. | Run with `RUN_DB_INTEGRATION_TESTS=true` and a reachable migrated test database. | Persistence and execution-request modules |
| `architecture-boundaries.test.ts` read `artifacts/api-server/src/...` relative to package CWD, producing duplicated paths such as `artifacts/api-server/artifacts/api-server/...`. | TEST_HARNESS_ISSUE | Fixed by using shared path helpers based on repository/package markers. | N/A — fixed in default suite. | Platform architecture boundaries |
| Bundled runner/source path assumptions using source-relative `import.meta.url` or fixed CWD paths. | TEST_HARNESS_ISSUE | Added shared path helpers for repo/package/source resolution and updated known failing harness tests. | Any new path-based test must use `test-harness-paths.ts`. | API-server test harness |

## Classification summary

- REAL_DEFECT: none identified in this sprint baseline.
- STALE_TEST: none identified.
- TEST_HARNESS_ISSUE: architecture boundary path resolution; bundled runner path assumptions.
- ENVIRONMENT_GAP: DB-backed approval workflow test requiring Postgres.
- DEPRECATED_FEATURE: none identified.
