# Certen Regression Baseline — Sprint 7

Date: 2026-06-15

## Full test command run

- `pnpm --filter @workspace/api-server run test`
- `pnpm test`
- `pnpm --filter @workspace/api-server run test -- certen-economic-control-chain.test.ts`
- `pnpm --filter @workspace/api-server run test -- outcome-finance-reconciliation.test.ts`
- `pnpm --filter @workspace/api-server run test -- outcome-finance-reconciliation-audit.test.ts`
- Adobe targeted files listed below.

## Result

- Sprint target regression (`pnpm test`) passed after graph integration and Adobe stabilisation.
- The unfiltered API-server scan (`pnpm --filter @workspace/api-server run test`) was executed to classify Adobe failures. It exposed the known broad-suite environment/path issues below; those are outside the Sprint 7 Adobe failure set and are not silently skipped.

## Failing tests before sprint

| Test | Classification | Reason |
| --- | --- | --- |
| `adobe-outcome-calibration.test.ts` | STALE_TEST | The test reused a computed readiness output as a new input, no longer matching the `AdobePhaseCInput` contract. |
| `adobe-reconciliation.test.ts` | TEST_HARNESS_ISSUE | Bundled CommonJS test runner erases `import.meta.url`, causing invalid file URL construction. |
| `adobe-replay-runtime.test.ts` | TEST_HARNESS_ISSUE | Bundled CommonJS test runner erases `import.meta.url`, causing invalid file URL construction. |
| `adobe-runtime-coverage.test.ts` | TEST_HARNESS_ISSUE | Bundled CommonJS test runner erases `import.meta.url`, causing invalid file URL construction. |
| `adobe-runtime-telemetry.test.ts` | TEST_HARNESS_ISSUE | Same import-meta harness issue discovered during full scan. |

## Failing tests after sprint

- Adobe targeted tests: none.
- Sprint target regression (`pnpm test`): none.
- Broad unfiltered API-server scan still includes pre-existing non-Adobe issues, including `approval-workflow.test.ts` requiring unavailable local PostgreSQL (`ECONNREFUSED`) and path assumptions such as `architecture-boundaries.test.ts` resolving `artifacts/api-server/artifacts/api-server/...`.

## Adobe failures classification

| Test | Classification | Fix applied | Owner/module | Date | Re-enable condition |
| --- | --- | --- | --- | --- | --- |
| `adobe-outcome-calibration.test.ts` | STALE_TEST | Updated to compare valid high-pressure vs low-pressure `AdobePhaseCInput` payloads. | Adobe Phase C governance | 2026-06-15 | Always enabled; remains in main test suite. |
| `adobe-reconciliation.test.ts` | TEST_HARNESS_ISSUE | Replaced `import.meta.url` file lookup with `resolve(process.cwd(), ...)`. | Adobe Phase A playbooks | 2026-06-15 | Always enabled; remains in main test suite. |
| `adobe-replay-runtime.test.ts` | TEST_HARNESS_ISSUE | Replaced `import.meta.url` file lookup with `resolve(process.cwd(), ...)`. | Operational telemetry / Adobe replay | 2026-06-15 | Always enabled; remains in main test suite. |
| `adobe-runtime-coverage.test.ts` | TEST_HARNESS_ISSUE | Replaced `import.meta.url` file lookup with `resolve(process.cwd(), ...)`. | Operational telemetry / Adobe runtime coverage | 2026-06-15 | Always enabled; remains in main test suite. |
| `adobe-runtime-telemetry.test.ts` | TEST_HARNESS_ISSUE | Replaced `import.meta.url` file lookup with `resolve(process.cwd(), ...)`. | Operational telemetry / Adobe telemetry | 2026-06-15 | Always enabled; remains in main test suite. |

## Quarantines added

None. Adobe failures were fixed in place and no tests were silently skipped.

## Fixes applied

- Outcome Finance graph linkage now delegates to `EconomicGraphService`/`EconomicGraphRepository` instead of a private graph writer path.
- Economic graph canonical enums now include Outcome Finance node types and `OWNED_BY`.
- Technology Commercial Authority, Financial Truth Authority, Ownership Intelligence, and Outcome Finance Reconciliation use the shared Economic Graph service path.
- Added `CERTEN_ECONOMIC_CONTROL_CHAIN_READY` audit and route.
- Added end-to-end economic control chain integration coverage.
- Fixed Adobe stale/harness regressions listed above.

## Known remaining gaps

- The broad unfiltered API-server scan remains noisy because some legacy tests require external PostgreSQL or contain repository-root path assumptions under the bundled runner. Those are not Adobe regressions and were not quarantined in this sprint.

## Re-enable conditions

- No Adobe quarantines to re-enable.
- For non-Adobe broad-suite environment failures: provide the required local PostgreSQL service or convert those tests to in-memory provider fixtures; correct bundled-runner path assumptions to use `process.cwd()` relative paths.
