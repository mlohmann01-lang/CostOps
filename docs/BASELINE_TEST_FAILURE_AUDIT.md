
## Sprint 17B Reconciliation

### Failures investigated

- `canonical-runtime-context.test.ts`
- `cloud-data-transfer-economics.test.ts`
- `cloud-workload-volatility-engine.test.ts`
- `connector-transaction-plan.test.ts`
- `customer-demo-m365.test.ts` path references to `customer-demo-scenario-m365.json` and `seed-customer-demo-m365.ts`
- `demo-pilot-separation.test.ts` path reference to `reset-golden-demo.ts`

### Classifications

| Area | Classification | Rationale |
| --- | --- | --- |
| Canonical runtime context export smoke | `TEST_HARNESS_ISSUE` | The source module contained only a TypeScript interface, so the generic runtime export-smoke assertion had no runtime value to inspect. |
| Cloud data transfer economics fixture | `STALE_TEST` | The fixture no longer crossed the `optimizationReviewRecommended` threshold because it set only one of six transfer-risk flags. |
| Cloud workload volatility fixture | `STALE_TEST` | The fixture no longer crossed the medium volatility threshold. |
| Connector transaction stale-state fixture | `STALE_TEST` | The fixture used a 1,000 ms age against a 300,000 ms stale-state threshold. |
| Demo fixture/script references | `WORKING_DIRECTORY_ISSUE` / `MISSING_ARTIFACT` path resolution | Files existed in repo-level `scripts/`, but api-server tests resolved them through non-existent `artifacts/scripts/`. |

### Fixes applied

- Added a runtime contract-version export to the canonical runtime context module.
- Updated stale test fixtures to meet the thresholds they asserted.
- Corrected api-server-to-repo-level script paths for customer demo and golden demo tests.
- Kept demo safety assertions focused on executable call patterns rather than fixture data field names.

### Remaining exceptions

- DB integration tests remain skipped unless `RUN_DB_INTEGRATION_TESTS=true` and database configuration are provided. This is existing harness behavior, not a Sprint 17B regression.

### Final counts

- Standard non-DB api-server run: 1,581 test files discovered by the runner.
- Failing files after reconciliation: 29 in the full run; 0 among the originally reported four test files after fixes.
- Final verdict: `NOT_CLEAN`.

## Sprint 17C Closure

### Final failure inventory

Sprint 17C ran the required build, typecheck, and full api-server test sequence. Build and typecheck completed successfully. The api-server test runner discovered 1,581 non-DB runnable test files, skipped 165 DB integration files because `RUN_DB_INTEGRATION_TESTS` was unset, and reported 29 failing files in the initial full run and 28 failing files in the final full run after the golden demo path fix.

The complete per-file classification is recorded in `docs/SPRINT17C_FAILURE_INVENTORY.md`.

### Fixes

- Fixed `golden-demo-seed.test.ts` path resolution by replacing ad-hoc `process.cwd()/../...` paths with the shared repo-root test harness resolver.

### Remaining exceptions

- `DB_ONLY`: 165 DB integration tests remain gated behind `RUN_DB_INTEGRATION_TESTS=true` and database configuration.

### Remaining non-DB failures

Non-DB failures remain in `REAL_DEFECT`, `HARNESS`, and `STALE_TEST` classifications. Because those are not allowed exceptions for a clean baseline, the Sprint 17C verdict is `NOT_CLEAN`.

## Sprint 17D Closure

Sprint 17D eliminated the 28 remaining non-DB api-server failing files from Sprint 17C. The failure-by-failure root cause, classification, action, and final status are recorded in `docs/SPRINT17D_FAILURE_MATRIX.md`.

### Final counts

- Standard api-server non-DB test files run: 1,581.
- Failing non-DB api-server test files: 0.
- DB-only integration test files skipped by harness gate: 165.

### Remaining exceptions

Only `DB_ONLY` exceptions remain. These tests require `RUN_DB_INTEGRATION_TESTS=true` and database configuration, including `DATABASE_URL`.

### Final baseline verdict

`CLEAN_WITH_DOCUMENTED_EXCEPTIONS`
