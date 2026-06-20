# Baseline Confidence Report

## Executive Summary

Current baseline status: `CLEAN_WITH_DOCUMENTED_EXCEPTIONS`.

Sprint 17D eliminated all 28 remaining non-DB api-server failures from Sprint 17C. The full non-DB api-server suite now completes with zero failing test files. The only remaining exceptions are DB integration tests that are explicitly gated by `RUN_DB_INTEGRATION_TESTS` and database configuration.

## Suite Health

```text
pass: 1,581 api-server non-DB test files
fail: 0 api-server non-DB test files
skip: 165 DB integration test files skipped because RUN_DB_INTEGRATION_TESTS was not set
```

## Remaining Exceptions

`DB_ONLY`: 165 DB integration files are intentionally gated by `RUN_DB_INTEGRATION_TESTS=true` and database configuration, including `DATABASE_URL`.

No unexplained non-DB failures remain.

## Confidence Rating

`HIGH`

Rationale: the standard api-server non-DB baseline is green and deterministic in the current environment. Confidence is not `VERY_HIGH` because DB integration execution was not part of the standard non-DB run and remains gated behind external database configuration.

## Recommendation

Proceed to Executive UX.

## Verdict

CLEAN_WITH_DOCUMENTED_EXCEPTIONS

## Sprint 18 Demo / Live Boundary Update (2026-06-20)

- Added canonical runtime data mode helpers for API server and control-plane with `DEMO`, `LIVE`, `TEST`, and `SIMULATION` modes.
- Removed a LIVE leak risk in tenant readiness where API failures could display demo readiness and connector health.
- Added static and runtime boundary tests for demo seed isolation, live state mapping, fixture imports, and customer-facing page imports.
- See `docs/DEMO_LIVE_DATA_BOUNDARY_AUDIT.md` for the full inventory and classifications.

## Sprint 18B Verification Closure (2026-06-20)

Final verdict: `VERIFIED`.

- Control-plane typecheck is clean after adding explicit `@workspace/api-client-react` build sequencing to control-plane scripts.
- Build order verified: db → api-zod → api-client-react → api-server → control-plane.
- Full API server test command completed: 1,582 test files selected; 165 DB integration tests explicitly skipped behind `RUN_DB_INTEGRATION_TESTS`; 0 non-DB failures.
- Full control-plane suite completed: 354 tests across 20 suites passed; 0 failures, 0 skipped.
- Final static demo/mock/fixture scan reviewed 2,303 hits and found 0 unresolved `LIVE_LEAK_RISK` findings.
