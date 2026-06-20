# Sprint 17C Failure Inventory

## Verification context

Commands run from repo root on 2026-06-20 UTC:

```bash
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
```

The build and typecheck commands completed successfully. The api-server test runner discovered 1,581 runnable non-DB test files and skipped 165 DB integration files because `RUN_DB_INTEGRATION_TESTS` was not set. The initial Sprint 17C full run completed with 29 failing test files. After fixing `golden-demo-seed.test.ts`, the required final full run completed with 28 failing test files.

## Skipped files

All skipped files were classified `DB_ONLY`: the api-server harness identified them as database integration tests and skipped them because `RUN_DB_INTEGRATION_TESTS` was unset. They require `RUN_DB_INTEGRATION_TESTS=true` and database configuration, including `DATABASE_URL`, for execution.

Skipped count: 165.

## Failing file inventory

| File | Failure summary | First failing assertion | Category | Sprint 17C disposition |
| --- | --- | --- | --- | --- |
| `economic-operations-rbac-middleware.test.ts` | Stale middleware expectations still assumed `x-actor-role` header overrides and header/query-derived actor context, while current middleware derives authority from auth context. | Expected actor role `APPROVER`, actual `VIEWER`. | `STALE_TEST` | Documented; requires test update to current auth-context authority semantics. |
| `economic-operations-telemetry.test.ts` | Bundled test emitted an asynchronous worker resolution error for `dist/tests/lib/worker.js`. | Test runner reported async uncaught exception after test completion. | `HARNESS` | Documented as harness bundling/worker artifact issue. |
| `economic-policy-evaluator.test.ts` | Policy outcome threshold expectation no longer matched current evaluator behavior. | Expected one verdict value, received a different current verdict. | `STALE_TEST` | Documented; requires fixture/expected outcome reconciliation. |
| `execution-boundary-protection.test.ts` | Static boundary scanner assertions failed across guarded folders. | Expected scanner result to be clean (`true`), actual was not clean. | `STALE_TEST` | Documented; broad scanner needs current forbidden-term inventory. |
| `executive-priority-routes.test.ts` | Route repository fixture returned no first row for tenant assertion. | `Cannot read properties of undefined (reading 'tenantId')`. | `REAL_DEFECT` | Documented for follow-up; likely missing seeded repository entry or changed ranking filter. |
| `executive-summary-engine.test.ts` | Summary calculation expectation no longer matched current top-five narrative/result shape. | Expected truthy assertion failed. | `STALE_TEST` | Documented; expected summary contract needs reconciliation. |
| `golden-demo-seed.test.ts` | Test resolved repo-root scripts and package metadata through `artifacts/` instead of the repository root. | `ENOENT` for `/workspace/CostOps/artifacts/scripts/seed-golden-demo.ts`. | `MISSING_ARTIFACT` | Fixed by using shared repo-root path resolver. |
| `m365-disabled-user-reclaim-slice.test.ts` | Economic operations route expectation did not match persisted M365 reclaim route state. | Expected strict equality failed. | `STALE_TEST` | Documented; route expectation needs current persistence contract. |
| `m365-playbooks.test.ts` | M365 playbook candidate/exclusion/risk expectations diverged from current recommendation behavior. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `m365-readonly-connector.test.ts` | Static read-only connector/endpoint expectations diverged from current source shape. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `m365-readonly-evidence-sync-service.test.ts` | Evidence sync classification/freshness fixture expectations diverged from current service output. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `m365-reclaim-lifecycle.test.ts` | Static route lifecycle assertion no longer matched current route source. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `opportunity-factory.test.ts` | Canonical opportunity persistence/provider aggregation expectation diverged from current factory behavior. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `opportunity-routes.test.ts` | Repository summary and tenant/filter assertions diverged from current route repository data. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `platform-subsystem-boundaries.test.ts` | Static subsystem boundary scanner assertions failed against current folder contents. | Expected scanner result to be clean (`true`), actual was not clean. | `STALE_TEST` | Documented. |
| `playbook-recommendation-flow.test.ts` | Test fixture expected an evaluator object that was undefined in current flow. | `Cannot read properties of undefined (reading 'evaluate')`. | `STALE_TEST` | Documented; fixture wiring requires update to current evaluator contract. |
| `route-guard-security.test.ts` | Bundled test emitted a harness-level worker/module error. | Test runner reported file failure without normal assertion summary. | `HARNESS` | Documented as harness bundling/worker artifact issue. |
| `runtime-boundary-hardening.test.ts` | Static boundary scanner assertions failed against current folder contents. | Expected scanner result to be clean (`true`), actual was not clean. | `STALE_TEST` | Documented. |
| `runtime-legacy-bypass-detection.test.ts` | Static legacy-bypass guard assertion no longer matched current boundary suite. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `runtime-route-authority-parity.test.ts` | Static runtime route authority parity assertion did not match current source. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `scale-lineage-growth.test.ts` | Scale pressure status/band expectation diverged from current model. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `scale-production-readiness-report.test.ts` | Scale readiness report status expectation diverged from current model. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `scale-replay-growth.test.ts` | Replay growth status/band expectation diverged from current model. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `scale-storage-fragmentation-recovery.test.ts` | Storage fragmentation recovery status/band expectation diverged from current model. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `scale-telemetry-delay-recovery.test.ts` | Telemetry delay recovery status/band expectation diverged from current model. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `scale-telemetry-throughput.test.ts` | Telemetry throughput status/band expectation diverged from current model. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `scale-tenant-isolation-pressure.test.ts` | Tenant isolation pressure status/band expectation diverged from current model. | Expected strict equality failed. | `STALE_TEST` | Documented. |
| `simulation-integrity.test.ts` | Replay integrity hash assertion returned false. | Expected strict equality failed. | `REAL_DEFECT` | Documented for follow-up; integrity mismatch should be investigated before changing assertions. |
| `token-governance.test.ts` | Verification total realized savings expectation diverged from current ledger calculation. | Expected strict equality failed. | `STALE_TEST` | Documented. |

## Closure verdict

`NOT_CLEAN`

Sprint 17C fixed the concrete missing-artifact path issue in `golden-demo-seed.test.ts`, but the final full-suite status cannot be reported as `CLEAN` or `CLEAN_WITH_DOCUMENTED_EXCEPTIONS` until remaining non-DB `REAL_DEFECT`, `HARNESS`, and `STALE_TEST` items are fixed or reconciled.
