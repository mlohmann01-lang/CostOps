# Baseline Regression Reconciliation — Sprint 17B

## Verdict

**NOT_CLEAN**

The originally reported Sprint 17 red tests were explainable and reproducible. The four named api-server failures were not product regressions: one was a type-only module harness edge case, and three were stale fixture inputs that no longer crossed the documented production thresholds. The missing demo fixture/script failures were incorrect relative paths from api-server tests into the repo-level `scripts/` workspace, not missing artifacts. However, the required full api-server run surfaced additional failures beyond the original Sprint 17 report, so the total baseline cannot honestly be declared clean in this reconciliation commit.

## Reproduction Matrix

| Run | Working directory | Environment captured | Package filter | Command line | Result | Equivalent? |
| --- | --- | --- | --- | --- | --- | --- |
| Sprint 14 baseline cleanup claim | `/workspace/CostOps` inferred from repo-root scripts | Not recorded in prior docs | `@workspace/api-server`, `@workspace/control-plane` | Reported only as `api-server: 1410/1410 passing`, `control-plane: 382/382 passing` | Historical report, no command provenance in repo docs | No. Missing command/env/filter evidence means it cannot be proven equivalent to Sprint 17 full api-server execution. |
| Sprint 17 documented coverage validation | `/workspace/CostOps` | Not recorded in prior docs | `@workspace/api-server` | `pnpm --filter @workspace/api-server run test -- p0-backend-critical-paths` | Narrow P0 pattern validation only | No. Pattern validation is not the same as the full api-server suite. |
| Sprint 17B full api-server reproduction before fixes | `/workspace/CostOps` | `env | sort` captured during investigation; no DB env was set, so DB tests followed harness skip behavior | `@workspace/api-server` | `pnpm --filter @workspace/api-server run test` | Reproduced the reported failures in isolation and full-suite context | Yes, for full api-server non-DB validation. |
| Sprint 17B build-order verification | `/workspace/CostOps` | Same shell; `RUN_DB_INTEGRATION_TESTS` unset | `@workspace/db`, `@workspace/api-zod`, `@workspace/api-server` | `pnpm --filter @workspace/db build`; `pnpm --filter @workspace/api-zod build`; `pnpm --filter @workspace/api-server build` | Build order completed; it did not explain the four assertion failures or missing path failures | No build-order dependency found for reported failures. |
| Sprint 17B final verification | `/workspace/CostOps` | Same shell; `RUN_DB_INTEGRATION_TESTS` unset | `@workspace/db`, `@workspace/api-zod`, `@workspace/api-server` | `pnpm --filter @workspace/db build && pnpm --filter @workspace/api-zod build && pnpm --filter @workspace/api-server build && pnpm --filter @workspace/api-server run typecheck && pnpm --filter @workspace/api-server run test` | Full non-DB suite run to completion after reconciliation | Not clean: 29 test files still failed outside the original reported set. |

## Failure Classification

| Test file | Failure message | Root cause | Isolation | Full suite only? | Classification | Fix applied |
| --- | --- | --- | --- | --- | --- | --- |
| `canonical-runtime-context.test.ts` | `false !== true` from `Object.values(m).length > 0` | The module exported only a TypeScript interface, which erases at runtime; the test harness asserted a runtime export existed. | Reproduced in isolation. | No. | `TEST_HARNESS_ISSUE` | Added a runtime contract-version export so the existing export-smoke test validates a stable value without changing runtime behavior. |
| `cloud-data-transfer-economics.test.ts` | `false !== true` for `optimizationReviewRecommended` | Test fixture had only one of six risk flags. Production threshold is `score > 0.2`; one flag yields `1/6`, below threshold. | Reproduced in isolation. | No. | `STALE_TEST` | Updated fixture to include two independent transfer-risk flags so the assertion exercises the review path. |
| `cloud-workload-volatility-engine.test.ts` | `'LOW' !== 'MEDIUM'` | Test fixture score was below the current medium threshold. | Reproduced in isolation. | No. | `STALE_TEST` | Updated fixture inputs to cross the documented medium volatility threshold while retaining shutdown-risk coverage. |
| `connector-transaction-plan.test.ts` | `true !== false` for `ready` | Test used `requestedAt: 1000` and `stateTimestamp: 0`, below the 300,000 ms stale-provider-state threshold. | Reproduced in isolation. | No. | `STALE_TEST` | Updated fixture to `requestedAt: 301000` so it actually represents stale provider state. |

## Missing Artifact Investigation

| Referenced path | Truth | Evidence | Classification | Fix applied |
| --- | --- | --- | --- | --- |
| `artifacts/scripts/fixtures/customer-demo-scenario-m365.json` | Incorrect path. The artifact exists at `scripts/fixtures/customer-demo-scenario-m365.json`. | `find` located `./scripts/fixtures/customer-demo-scenario-m365.json`; no `artifacts/scripts` workspace exists. | `WORKING_DIRECTORY_ISSUE` / `MISSING_ARTIFACT` path resolution | Updated the api-server test to resolve `../../scripts/fixtures/customer-demo-scenario-m365.json` from the api-server working directory. |
| `artifacts/scripts/seed-customer-demo-m365.ts` | Incorrect path. The script exists at `scripts/seed-customer-demo-m365.ts`. | `find` located `./scripts/seed-customer-demo-m365.ts`. | `WORKING_DIRECTORY_ISSUE` | Updated the api-server test to resolve the repo-level `scripts` workspace. |
| `artifacts/scripts/reset-golden-demo.ts` | Incorrect path. The script exists at `scripts/reset-golden-demo.ts`. | `find` located `./scripts/reset-golden-demo.ts`; package root script also references `@workspace/scripts`. | `WORKING_DIRECTORY_ISSUE` / `MISSING_ARTIFACT` path resolution | Updated the import-meta-relative test path to the repo-level `scripts` workspace. |

## Build Order Verification

The requested build sequence completed successfully:

```bash
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/api-server build
```

The failures reproduced before and after build-order checks, and each failing file also reproduced in isolation. Therefore the reported failures are not `BUILD_ORDER_ISSUE` failures.

## Regression Determination

No reported failure was classified as `REAL_REGRESSION`.

- `TEST_HARNESS_ISSUE`: `canonical-runtime-context.test.ts`.
- `STALE_TEST`: `cloud-data-transfer-economics.test.ts`, `cloud-workload-volatility-engine.test.ts`, `connector-transaction-plan.test.ts`.
- `WORKING_DIRECTORY_ISSUE` / `MISSING_ARTIFACT` path references: customer demo fixture, customer demo seed script, golden demo reset script.
- `BUILD_ORDER_ISSUE`: none found.
- `OBSOLETE_TEST`: none retired.

## Fixes Applied

- Added a runtime export to the canonical runtime context module for export-smoke visibility.
- Updated stale threshold fixtures so tests exercise the intended production paths.
- Corrected api-server tests that referenced repo-level scripts through `artifacts/scripts`.
- Narrowed the customer demo static safety assertion so data fields such as `connector: "M365"` are allowed while actual connector/Graph/fetch call patterns remain prohibited.

## Final Counts

Final non-DB api-server validation ran 1,581 test files with 165 DB integration tests skipped by the existing harness because `RUN_DB_INTEGRATION_TESTS` was unset. The final run completed with 29 failing test files, all outside the original four reported files and the investigated missing-artifact path references.

## Final Baseline Verdict

**NOT_CLEAN**

The original Sprint 17 discrepancy is explained and the originally reported failures were reconciled, but the full api-server baseline still has unexplained failures outside the original report. The standard non-DB suite is therefore not clean. The documented DB exception remains: DB integration tests are skipped unless `RUN_DB_INTEGRATION_TESTS=true` and database configuration are supplied.

## Additional Failures Surfaced By Full Run

The required final full-suite run found 29 failing test files outside the originally reported Sprint 17 failure set. These remain unresolved in this commit and keep the baseline at `NOT_CLEAN`:

- `economic-operations-rbac-middleware.test.ts` — `TEST_HARNESS_ISSUE` candidate; mock request/response middleware expectations diverge from current middleware behavior.
- `economic-operations-telemetry.test.ts` and `token-governance.test.ts` — `TEST_HARNESS_ISSUE` candidate; bundled tests trigger asynchronous pino worker resolution for `dist/tests/lib/worker.js` after test completion.
- `economic-policy-evaluator.test.ts` — `STALE_TEST` candidate; expected `BLOCKED`, actual `APPROVAL_REQUIRED`.
- `execution-boundary-protection.test.ts` — `STALE_TEST` / boundary-word scanner candidate; broad string scanning reports forbidden terms across many folders without naming the exact file/term in the assertion.
- `golden-demo-seed.test.ts` — `WORKING_DIRECTORY_ISSUE`; test resolves repo-root `package.json` through `artifacts/package.json`.
- `m365-disabled-user-reclaim-slice.test.ts` — unresolved; route/source assertion failed in full run.
- Scale pressure tests (`scale-lineage-growth.test.ts`, `scale-production-readiness-report.test.ts`, `scale-replay-growth.test.ts`, `scale-storage-fragmentation-recovery.test.ts`, `scale-telemetry-delay-recovery.test.ts`, `scale-telemetry-throughput.test.ts`, `scale-tenant-isolation-pressure.test.ts`) — `STALE_TEST` candidates; expected bands/statuses no longer match current scoring thresholds.
- `simulation-integrity.test.ts` — unresolved; replay integrity assertion returned false.

Because the full run completed and these failures remain, the baseline verdict is `NOT_CLEAN`, not `CLEAN_WITH_DOCUMENTED_EXCEPTIONS`.
