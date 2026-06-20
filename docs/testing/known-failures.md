# Known Test Failures

Sprint 18B verification closure (2026-06-20) resolved the previously quarantined control-plane baseline failures.

Current status:

| Scope | Status |
|---|---:|
| Control-plane known failures | 0 active |
| Full control-plane suite | 354 passed / 0 failed / 0 skipped |
| API server non-DB suite | Passed; DB integration tests remain explicitly gated by `RUN_DB_INTEGRATION_TESTS` |

## Resolved during Sprint 18B

| Previous Failure IDs | Resolution |
|---|---|
| KP-001 through KP-014 | Full control-plane suite now passes. Assertions were updated to current route/source contracts where tests had drifted, shared JSX components import React explicitly for server rendering, and Data Trust endpoint coverage now includes the M365 connector trust route. |

## Baseline Rules

- `PASS`: the selected test file completed successfully.
- `KNOWN FAIL`: no active known failures are currently accepted.
- `NEW FAIL`: any failing selected test is a blocker unless a future sprint explicitly documents and approves an exception.
