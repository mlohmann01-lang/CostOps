# Demo / Live Data Boundary Audit

Date: 2026-06-20

## Boundary contract

Runtime data mode is canonicalized to `DEMO`, `LIVE`, `TEST`, or `SIMULATION`.

- `DEMO`: deterministic seeded story only.
- `LIVE`: live APIs/persistence only; empty/missing/error surfaces become `NO_DATA`, `NOT_CONNECTED`, or `ERROR`.
- `TEST`: test fixtures may be used by tests only.
- `SIMULATION`: explicitly configured simulated connector behavior only.

## Allowed demo seed boundaries

| Location | Classification | Decision |
|---|---:|---|
| `artifacts/api-server/src/lib/demo-seed/` | DEMO_ALLOWED | Canonical API demo seed envelope; throws outside DEMO mode. |
| `artifacts/control-plane/src/lib/demo-seed/` | DEMO_ALLOWED | Canonical control-plane demo seed data for demo-only surfaces. |
| `scripts/fixtures/customer-demo-scenario-m365.json` | DEMO_ALLOWED | Script-only demo scenario fixture; guarded by `DEMO_MODE=true`. |
| `scripts/seed-*-demo.ts` | DEMO_ALLOWED | Operational seed scripts; must remain explicit operator commands. |

## Inventory decisions

| Finding | Classification | Runtime decision |
|---|---:|---|
| Control-plane demo runtime store and `src/data/demo.ts` | DEMO_ALLOWED | Allowed only under workspace demo mode. |
| Control-plane test files using mock/demo data | TEST_ONLY | Allowed in `*.test.ts(x)` and test runner only. |
| API server `src/tests/*fixture*.test.ts` | TEST_ONLY | DB/test fixtures are excluded from normal LIVE routes. |
| `attached_assets/` sprint prompts and pasted historical mock examples | TEST_ONLY | Not production code; ignored by runtime boundary. |
| Documentation examples with `tenant-abc`, `contoso-pilot`, or placeholders | PRODUCTION_CONSTANT | Documentation-only examples; not imported by runtime code. |
| Schema defaults such as `isSampleBatch` and `simulationMode` | PRODUCTION_CONSTANT | Domain terms for production workflow, not demo seed data. |
| Connector readiness `sample` response slices from live APIs | PRODUCTION_CONSTANT | API preview payloads sourced from live connector reads; not fixtures. |
| M365 live connector | LIVE_READ / LIVE_EXECUTE gated | Read path remains live-capable; mutations remain governed by live flags and runtime guards. |
| Flexera connector | LIVE_READ | Read-only/partial integration; no LIVE synthetic fallback permitted. |
| ServiceNow/AWS/Azure/Snowflake/Databricks mock or stub paths | STUB / SIMULATED | Must not masquerade as LIVE; static tests guard mock connector leakage. |
| `useLiveTenantReadinessData` inline fallback payload | LIVE_LEAK_RISK → DEMO_ALLOWED/REMOVED | Inline fake payload moved to demo seed boundary; LIVE API errors now return empty/error state instead of demo data. |
| Page-level labels, copy, thresholds, enum display maps | PRODUCTION_CONSTANT | Allowed non-business constants. |

## Removed live leak risks

- Removed the LIVE error fallback in `useLiveTenantReadinessData` that previously swapped in demo connector health, blockers, policy, and evidence export readiness when APIs failed.
- Added explicit empty LIVE state for tenant readiness to represent clean live startup without seeded data.
- Added deterministic demo seed module for tenant readiness so demo data lives behind a labelled seed boundary.

## Static boundary tests

- API server tests assert live route/service code does not import demo seed modules or fixture JSON.
- API server tests assert live state resolution never returns `DEMO` and demo seed creation throws in LIVE mode.
- Control-plane tests assert customer-facing pages do not import demo seed modules directly.
- Control-plane tests assert the live tenant readiness hook does not set demo mode or demo data on API errors.

## Runtime behavior evidence

- LIVE empty data maps to `NO_DATA`.
- LIVE missing connector maps to `NOT_CONNECTED`.
- LIVE API error maps to `ERROR`.
- DEMO seed returns deterministic `DEMO` state and demo tenant identifiers.
- Switching from DEMO to LIVE uses separate helpers; demo envelopes throw when requested in LIVE mode.

## Remaining accepted fixtures

No `UNKNOWN` findings remain. Remaining demo/test fixtures are classified as `DEMO_ALLOWED`, `TEST_ONLY`, or `PRODUCTION_CONSTANT` above.

## Sprint 18B Verification Closure (2026-06-20)

### Typecheck closure classification

| Finding | Classification | Root cause | Resolution |
|---|---:|---|---|
| `@workspace/api-client-react` declaration references during control-plane typecheck | BUILD_ORDER / STALE_BUILD_ARTIFACT | Control-plane imports generated declarations from `@workspace/api-client-react`; running typecheck before that package builds leaves stale or missing `.d.ts` outputs. | Control-plane `build` and `typecheck` scripts now build `@workspace/api-client-react` first. |
| Dashboard / execution-log implicit-any reports from prior run | BUILD_ORDER side effect | These appeared with stale project-reference declarations. After rebuilding `@workspace/api-client-react`, `pnpm --filter @workspace/control-plane run typecheck` is clean. | No production code change required. |
| Control-plane build requiring `PORT` and `BASE_PATH` | BUILD_ORDER / ENV_DEFAULT | Vite config is intentionally strict about runtime env; CI verification did not provide these env vars. | Control-plane `build` script supplies safe build-time defaults: `PORT=${PORT:-5173}` and `BASE_PATH=${BASE_PATH:-/}`. |
| Full control-plane test failures after enabling full run | LEGACY_ISSUE | Several assertions checked older source strings/endpoints rather than current LIVE-safe behavior. React 19 server rendering also required explicit React imports in shared JSX components. | Updated verification assertions to current behavior and added explicit React imports to shared timeline components. |

### Final build and verification results

| Command | Result | Notes |
|---|---:|---|
| `pnpm --filter @workspace/db build` | PASS | Build completed. |
| `pnpm --filter @workspace/api-zod build` | PASS | Build completed. |
| `pnpm --filter @workspace/api-client-react build` | PASS | Required before control-plane build/typecheck. |
| `pnpm --filter @workspace/api-server build` | PASS | Build completed; bundle-size warning only. |
| `pnpm --filter @workspace/control-plane build` | PASS | Build completed; Vite chunk-size warning only. |
| `pnpm --filter @workspace/api-server run typecheck` | PASS | Typecheck completed. |
| `pnpm --filter @workspace/control-plane run typecheck` | PASS | Clean after dependency build sequencing fix. |
| `pnpm --filter @workspace/api-server run test` | PASS | 1,582 test files selected; 165 DB integration tests explicitly skipped because `RUN_DB_INTEGRATION_TESTS` is not set; 0 non-DB failures. |
| `pnpm --filter @workspace/control-plane run test` | PASS | 354 tests / 20 suites passed; 0 failures, 0 skipped. |

### Static boundary scan closure

Final scan command:

```bash
rg -n "demo|mock|fixture|sample|synthetic|fake|placeholder|golden|pilot" artifacts/api-server/src artifacts/control-plane/src scripts docs --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**'
```

Reviewed 2,303 hits:

| Classification | Count | Decision |
|---|---:|---|
| TEST_ONLY | 802 | Test files and test audit references only. |
| DEMO_ALLOWED | 320 | Demo seed/runtime, explicit seed scripts, and guarded fixture locations. |
| PRODUCTION_CONSTANT | 1,181 | Documentation, route names, connector sample slices sourced from live reads, and domain terminology such as pilot/readiness/sample batch. |
| LIVE_LEAK_RISK | 0 | No unresolved live leak risks remain. |

### Sprint 18B verdict

`VERIFIED`

The Sprint 18 demo/live boundary is verified: control-plane typecheck is clean, full API server non-DB suite completes with DB tests gated, full control-plane suite is green, and the final static scan has no unresolved `LIVE_LEAK_RISK` findings.
