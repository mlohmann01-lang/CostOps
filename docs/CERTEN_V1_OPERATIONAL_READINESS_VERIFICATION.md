# Certen v1 — Operational Readiness Verification

**Date:** 2026-07-08
**Scope:** Verify whether Certen v1 is ready to operate with real customers and live data, beyond the certified application build. No new product features were built as part of this verification. Findings are based on direct code inspection, targeted test/build execution, and cross-referencing existing operational docs against the code that is supposed to implement them.

---

## Executive Summary

Certen v1 has a genuinely substantial engineering base — real RBAC middleware, real tenant-scoped DB queries, real OAuth/Microsoft Graph client code, real DB-backed health checks, and a fail-closed environment/config validator that exits the process on unsafe production settings. This is not a hollow demo.

However, five independent, code-level investigations (one per readiness area) each surfaced concrete, reproducible gaps between what the operational docs claim and what the code actually enforces:

- **Authentication**: the Microsoft Entra OAuth code-exchange is a stub that returns mock claims; session tokens issued at login are never persisted or re-validated; several routers (dashboard, jobs, approvals, outcomes) mount with no tenant/capability guard at all; and the frontend demo login is a hardcoded-credential, fully client-side bypass with no environment gate.
- **Connectors**: real `fetch()` calls to `login.microsoftonline.com` and `graph.microsoft.com` exist and are wired into discovery paths, but the encrypted token store is in-memory only (lost on restart) with an insecure default key, the Graph "health check" never actually pings Graph, and the `dryRun()` path silently returns fixture data labeled `"READY"` when no live credentials are configured.
- **Security**: the environment/config validator is a real, fail-closed control. But the governed-execution router — approve/execute/cancel of live actions — is gated only by a coarse `READ_RECOMMENDATIONS` capability at the router level, with no service-level re-check, meaning a read-only VIEWER-role token can call execute/approve/cancel. Audit-logging middleware exists but is never mounted, so the execution path produces no audit trail. `RBAC_MATRIX.md`'s role model does not match the roles actually implemented in code.
- **Performance**: the Vite bundle-size warning is real and reproducible (735 KB / 194 KB gzip single chunk) with zero mitigation — no route-level code-splitting, no manual chunking. The "load readiness" documentation in `docs/runtime-hardening/` turns out to be deterministic arithmetic simulations validated by unit tests, not measurements from a running system under load.
- **Monitoring**: `/readiness` and `/health/ready` do real Postgres checks. But alerting is functionally disconnected — the `operator_alerts` table is dead schema, the in-memory alert store is never populated by any real failure path, and there is no PagerDuty/Slack/email/Sentry delivery channel anywhere in the codebase (a "Slack contract" file is a no-op identity stub).

None of the five areas reaches VERIFIED. Given the severity of the security finding (privilege escalation on the live execution path) and the completeness gaps in auth, connector durability, and alerting, this report concludes:

**Final Verdict: NOT_OPERATIONALLY_READY**

---

## Verification Scope

This audit covered the monorepo at `/home/user/CostOps`:
- `artifacts/api-server` — Express/TypeScript backend (routes, middleware, connectors, auth, security, observability)
- `artifacts/control-plane` — React/Vite frontend (the operator-facing app)
- `artifacts/mockup-sandbox` — secondary Vite frontend
- `lib/db`, `lib/api-zod`, `lib/api-client-react` — shared schema/contract packages
- `scripts/` — seeding, smoke-test, and runtime-env validation scripts
- `docs/`, root-level `*.md` operational docs, `k8s/`, `helm/`, `infra/`, `docker-compose.prod.yml`

Method: dependencies were installed fresh (`pnpm install --frozen-lockfile`), the full workspace typecheck and test suite were run directly, and five parallel deep-dive investigations were conducted — one per readiness area — each required to cite exact `file:line` evidence and explicitly distinguish code that *enforces* a behavior from documentation that merely *describes* it.

---

## Authentication / Identity

**Status: PARTIAL**

**Evidence:**
- RBAC/tenant-guard middleware is real and enforced: `artifacts/api-server/src/middleware/security-guards.ts:11-49` (`requireTenantContext`, `requireCapability`) compares `auth.tenantId` against the requested tenant and returns 403/400 on mismatch; mounted on most routers in `artifacts/api-server/src/routes/index.ts:94-178`.
- `artifacts/api-server/src/middleware/economic-operations-rbac-middleware.ts:30-75` derives role strictly from a validated JWT (`buildAuthContextSync`) — a comment at line 32 confirms a prior `x-actor-role` header-override bypass was removed.
- JWT validation is real and multi-mode: `artifacts/api-server/src/lib/auth/providers/jwt-validation.ts:17-139` supports JWKS/PUBLIC_KEY/HMAC via `jose`; the unsigned `DEV_FALLBACK` mode is explicitly blocked when `NODE_ENV=production` (lines 94-97).
- Tests pass: `auth-rbac.test.ts` + `economic-operations-rbac-middleware.test.ts` (20/20), `demo-live-data-boundary.test.ts` (6/6, verifies live routes don't import demo/fixture modules).
- Tenant identity/session schema exists: `lib/db/src/schema/auth.ts:3-27` (`auth_users`, `auth_sessions` with `expiresAt`/`revokedAt`).

**Gaps:**
1. The Entra OAuth code-exchange is a stub: `artifacts/api-server/src/lib/auth/providers/microsoft-entra.ts:9-16` never calls Entra's token endpoint — it calls `validateJwtToken("mock")` with a `TODO` comment left in place.
2. Session tokens issued by `/login/callback` (`artifacts/api-server/src/routes/auth.ts:15-21`) are never persisted to, or re-validated against, the `auth_sessions` table — that table is dead schema with zero other references in the codebase. The login flow and the JWT-bearer-auth flow that actually gates requests are disconnected.
3. `/logout` (`routes/auth.ts:40`) returns `{revoked:true}` without invalidating anything server-side.
4. The legacy `authMiddleware` (`artifacts/api-server/src/middleware/auth.ts:8-15`), still used by `jobs.ts` and `approvals.ts`, calls a context builder that never throws on missing auth (`auth-context.ts:59-70` falls back to an `UNAUTHENTICATED_CONTEXT` object) — its 401 branch is dead code, so those routes have no enforced login requirement.
5. Several routers — `dashboard.ts`, `jobs.ts`, `approvals.ts`, `outcomes.ts`, `economic-operations`, `demo`, `enterprise`, `onboarding` — mount with no `requireTenantContext`/`requireCapability` guard; `dashboard.ts` queries entire tables with no `tenantId` filter, a cross-tenant data-leak risk.
6. The frontend demo login (`artifacts/control-plane/src/App.tsx:61-90`, `session.ts:20-58`) is a hardcoded-credential, fully client-side session fabrication with no server round-trip and no environment gate — unlike the backend's own `/api/auth/demo-login`, which *is* gated behind `NODE_ENV`/`ALLOW_DEMO_LOGIN` (`routes/auth.ts:24`).
7. `AUTH_GUARD_REVIEW.md` documents a header-based (`x-role`/`x-user-id`) model that the code has since removed — the doc is stale relative to the implementation.

**Recommended next actions:**
- Implement the real Entra authorization-code token exchange and wire it to a persisted, re-validated session (or drop the unused `auth_sessions` table and formally document JWT-bearer as the only session mechanism).
- Add `requireTenantContext`/`requireCapability` to every router currently unguarded, starting with `dashboard.ts` (tenant data leak).
- Remove or gate the client-side demo-login bypass in `App.tsx` behind a build-time flag equivalent to the backend's `ALLOW_DEMO_LOGIN`.
- Fix or delete the dead-code 401 path in the legacy `authMiddleware`.
- Refresh `AUTH_GUARD_REVIEW.md` and `RBAC_MATRIX.md` to match the actual implemented role/guard model.

---

## Live Connectors / Credentials

**Status: PARTIAL**

**Evidence:**
- Real OAuth client-credentials flow and real Graph HTTP calls exist: `artifacts/api-server/src/lib/connectors/m365/m365-auth.ts:18-31` POSTs to `login.microsoftonline.com/.../oauth2/v2.0/token`; `m365-graph-client.ts:39-118` fetches users/licenses/activity from Graph with pagination and 429/5xx retry/backoff.
- Token encryption is real code: `artifacts/api-server/src/lib/microsoft-auth/microsoft-token-store.ts:1-29` uses AES-256-GCM via Node `crypto`.
- A real connector readiness state machine exists: `m365-readiness.ts:10-38` computes `MISSING_CONFIG / TOKEN_FAILED / GRAPH_UNREACHABLE / INSUFFICIENT_PERMISSIONS / READY`.
- Live-tenant gating is real and DB-backed: `live-tenant-readiness-service.ts:4,10` explicitly flags any `source==='demo-fixture'`/`valueSource==='sample-tenant'` evidence and blocks `overallStatus='READY'`; persisted via Drizzle in `live-tenant-readiness-persistence.ts` / `connector-readiness-persistence.ts` (not in-memory).

**Gaps:**
1. The encrypted token store is `private readonly records = new Map()` — **in-memory only**, lost on process restart — and its encryption key defaults to the hardcoded string `"local-dev-encryption-boundary"` if `MICROSOFT_TOKEN_ENCRYPTION_KEY` is unset.
2. `graphReachable` in the readiness computation defaults to `true` whenever a token is acquired unless a caller injects a `graphProbe` — and no call site anywhere in the codebase (`connectors.ts`, `m365-health.ts`, `m365-trust.ts`, `m365-discovery-service.ts`) ever passes one. `GRAPH_UNREACHABLE` can therefore never actually be detected; "health" only confirms token issuance.
3. `artifacts/api-server/src/lib/production-connectors/m365/m365-client.ts:19` (and the equivalent `entra-client.ts`): when `credentialRef`/`tokenProvider` is missing, or `useFixtures` is set, the connector returns `{status: "READY", records: m365Fixtures}` — fixture data labeled `READY`, not `BLOCKED`/`NOT_CONFIGURED`. The `sync()` path guards against this via `tokenProvider`/`liveTenantReady` checks, but `dryRun()` calls `fetchRawRecords()` directly with no such guard, so a dry run against an unconfigured tenant silently returns fixture records marked complete.
4. M365 discovery snapshots (`m365-snapshot-repository.ts:8-10`) are stored in a `static Map()`, not the database — discovered live tenant data is lost on restart.
5. Two divergent environment variable names gate the same live-mutation control: docs (`M365_AUTH_SETUP.md:65,86`) reference `M365_LIVE_LICENSE_MUTATION_ENABLED`, while the Graph client itself checks `M365_ENABLE_LIVE_LICENSE_MUTATION` (`m365-graph-client.ts:197`). Setting only the documented variable leaves the client's own mutation gate unaffected.
6. `routes/health.ts:118-119` reports connector "health" from `M365_GRAPH_MODE` env presence — a config-presence label, not a live dependency check.
7. `scripts/validate-runtime-env.ts` only validates demo-mode configuration; there is no equivalent live/production runtime-env validation script.

**Recommended next actions:**
- Persist encrypted tokens to the database (or a secrets manager), not an in-memory `Map`; require `MICROSOFT_TOKEN_ENCRYPTION_KEY` to be set in production (fail closed, matching the pattern already used for `JWT_SECRET`).
- Wire a real `graphProbe` into every readiness/health call site so `GRAPH_UNREACHABLE` is reachable.
- Close the `dryRun()` fixture-fallback gap — dry runs against unconfigured tenants must return a blocked/not-configured state, never `READY`.
- Persist M365 discovery snapshots to the database.
- Reconcile the two live-mutation env var names into one, and update `M365_AUTH_SETUP.md` to match.
- Add a live/production counterpart to `validate-runtime-env.ts`.

---

## Security Hardening

**Status: PARTIAL**

**Evidence:**
- The environment/config layer fails closed in production: `artifacts/api-server/src/lib/config/env.ts:22-65` rejects missing/short `JWT_SECRET` and wildcard/missing `ALLOWED_ORIGINS`; `production-config-validator.ts:46-97` checks demo-mode, default-tenant fallback, live-mutation-without-auth, and wildcard CORS; both are invoked at startup (`src/index.ts:6-18`) and call `process.exit(1)` on failure — real enforcement, not documentation.
- No hardcoded secrets/API keys/private keys found committed to source; `infra/sample.env.production` has only an empty placeholder.
- CORS is locked to `ALLOWED_ORIGINS`, not wildcard, and the validator rejects wildcard/empty in production.
- Tenant isolation is enforced at the query layer: `governed-execution-persistence.ts:4` scopes every get/list/delete with `and(eq(tenantId, t), ...)`.
- Rate limiting exists and is applied globally (`middleware/rate-limit.ts:53-93`, `app.ts:39`), with an honest self-documented limitation that it is single-process only.
- A real, non-trivial supply-chain control exists: `pnpm-workspace.yaml` enforces a 1-day `minimumReleaseAge` on all npm package installs.

**Gaps:**
1. **Broken access control (critical):** the governed-execution router — `POST /plans/:id/approve`, `.../execute`, `.../cancel` (`routes/governed-execution.ts:20-22`) — is mounted (`routes/index.ts:133`) behind only `requireCapability("READ_RECOMMENDATIONS")`. No route in `governed-execution.ts`, nor anything in the `lib/governed-execution/*.ts` service layer, performs a finer-grained capability check. A token with only the read-only VIEWER role's capabilities can therefore call approve/execute/cancel on live governed actions. This directly contradicts `RBAC_MATRIX.md` ("VIEWER: read-only", "`EXECUTION_APPROVE` ❌ for viewer").
2. **No audit trail on the execution path:** `middleware/audit-middleware.ts` implements an auto-audit wrapper but is never imported or mounted anywhere; `lib/governed-execution/*.ts` never calls `recordAuditEvent`/`recordApprovalEvent`. The most sensitive action path in the system — approving/executing live changes — produces no audit record.
3. `RBAC_MATRIX.md`'s documented role model (OWNER/ADMIN/ECONOMIC_OPERATOR/etc.) does not match the roles actually implemented in code (`PLATFORM_ADMIN/TENANT_ADMIN/APPROVER/OPERATOR/VIEWER`) — the matrix is aspirational, not a description of enforced behavior.
4. Input validation via zod is the minority pattern: only 13 of 86 route files use it. High-traffic mutating routes with no schema validation include `governed-execution.ts` (22 raw body/param uses), `connectors.ts` (41), `simulations.ts` (25, raw `String()`/`Number()` coercion with no rejection of malformed input), `execution-orchestration.ts` (24), `packs.ts` (26), `outcomes.ts` (20).
5. No automated dependency/CVE scanning (Dependabot, Snyk, `npm audit` in CI) is wired in, despite the strong `minimumReleaseAge` control existing alongside it.
6. The frontend hardcoded demo-login credential check (see Authentication section) ships in the client bundle; while backend JWT validation limits real damage, it should not visually resemble a production auth flow.

**Recommended next actions:**
- **Priority 1:** add a service-level or per-route capability check to the governed-execution approve/execute/cancel endpoints so VIEWER-role tokens are rejected — this is a live privilege-escalation gap, not a documentation gap.
- Mount `audit-middleware.ts` (or add direct `recordAuditEvent` calls) on the governed-execution path before any live customer executes real actions through it.
- Rewrite `RBAC_MATRIX.md` to match the roles/capabilities actually implemented, or update the code to match the documented model — pick one source of truth.
- Extend zod validation to the mutating routes listed above, starting with `governed-execution.ts` and `connectors.ts`.
- Add `npm audit`/Dependabot or equivalent SCA scanning to CI.

---

## Performance / Load Readiness

**Status: MISSING**

**Evidence:**
- Production build was run directly (`pnpm --filter @workspace/control-plane run build`, ~4.4s, succeeded). Output: `dist/public/assets/index-CAV7yIAD.js` = **735.57 kB** (194.66 kB gzip), with Vite's explicit warning: *"Some chunks are larger than 500 kB after minification... Consider using dynamic import()... manualChunks..."*
- No mitigation implemented anywhere: neither `artifacts/control-plane/vite.config.ts` nor `artifacts/mockup-sandbox/vite.config.ts` sets `manualChunks` or `chunkSizeWarningLimit`; `React.lazy`/`lazy(` has zero matches across both frontends' source.
- Static fixtures are small (`scripts/fixtures/*.json` total 16K) and the larger server-side mock-telemetry module (20K) is not imported into the client bundle.
- Server-side connector clients do implement pagination and bounded timeouts (`m365-graph-client.ts` `AbortController` with 15s default), which is a real, if narrow, performance safeguard.
- Rate limiting (see Security section) is explicitly self-documented as single-process/non-distributed, unfit for the multi-instance deployment implied by `k8s/deployment.yaml` (`replicas: 2`).
- The "load readiness" work in `docs/runtime-hardening/sustained-runtime-load-phase-c-recon.md` and `sustained-runtime-load-phase-c.ts` is deterministic arithmetic (`simulateTelemetryThroughput`, `simulateReplayGrowth`) validated only by `node:test` unit assertions — no HTTP traffic generation, no server run under load, no measured latency/throughput. No k6/artillery/autocannon/locust anywhere in the repo.
- No documented SLA/throughput ceiling (e.g., "supports N tenants" or "N req/s") exists anywhere in the docs.

**Gaps:**
1. The Vite >500 kB bundle-size warning is real, reproducible, and completely unaddressed.
2. Documents in `docs/runtime-hardening/` claiming "Status: REMEDIATED" for scale/throughput concerns are based on unit-tested formulas, not measurements — labeling this as load-readiness would misrepresent it.
3. Rate limiting will not function correctly across the k8s deployment's multiple replicas.
4. No performance/throughput SLA is documented or measured anywhere.

**Recommended next actions:**
- Add `manualChunks` (vendor/UI-library split) to `vite.config.ts` and route-level `React.lazy` for the control-plane's heavier pages, to close the specific warning that was reproduced during this audit.
- Replace the in-memory rate limiter with a Redis-backed (or equivalent shared-state) implementation before enabling multi-replica production traffic — the code's own comment already flags this.
- Run an actual load test (e.g. k6/autocannon) against a staging deployment and record real latency/throughput numbers before claiming any scale readiness; retitle the `docs/runtime-hardening/` simulation docs to make clear they are analytical projections, not measured results.

---

## Monitoring / Alerting

**Status: PARTIAL**

**Evidence:**
- Real, DB-aware health endpoints exist: `routes/health.ts:26-63` (`/readiness`) runs `select 1` against Postgres and checks `information_schema.tables`; `health.ts:74-104` (`/health/ready`) checks DB reachability, migration presence, and calls `validateProductionConfig()`.
- `routes/runtime-observability.ts:19-58` (`/runtime/health`) aggregates several live services (`checkM365LiveReadiness`, `outcomeProofService`, `executiveValueService`) with real try/catch fallback states — not hardcoded.
- The frontend correctly separates demo and live health data: `hooks/useRuntimeHealthData.ts:9-14` branches explicitly on `workspace.mode`, fetching real endpoints (`/api/runtime/health`, `/status`, `/connectors`, `/metrics`) in live mode rather than always showing fixture data.
- Structured logging is genuinely wired: `pinoHttp` is attached globally (`app.ts:12-30`), a global error handler logs unhandled errors with request context, and ~50 catch blocks across routes forward to `classifyProductionError`/structured logging rather than swallowing errors silently. Sensitive headers/cookies are redacted (`lib/logger.ts:1-20`).
- `k8s/deployment.yaml:14-15` wires real `readinessProbe`/`livenessProbe` to the actual `/readiness` and `/health` endpoints.
- `RUNBOOK.md`/`RUNTIME_OPERATIONS.md` reference real, existing endpoints (`/health/live`, `/health/ready`, `/api/economic-operations/alerts`).

**Gaps:**
1. **No alerting delivery exists at all.** No PagerDuty, Slack, email, or Sentry integration anywhere in the codebase — `lib/runtime-interface-contracts/runtime-slack-contract.ts` is a no-op identity-function stub despite its name.
2. Alert generation is orphaned: the `operator_alerts` DB table (`lib/db/src/schema/operatorAlerts.ts`) has zero writers/readers anywhere in `api-server/src`; the actual alert implementation (`operational-events-service.ts:95-186`) is an in-memory singleton array, reset on restart, and its `emitEvent`/`createAlert` methods are never called from any real failure path (connector failure, drift detection, execution block) — only from tests.
3. Connector/runtime health state (`lib/observability/runtime-health.ts:5-13`, `connectors/connector-health.ts:10-13`) is stored in per-process `Map`s, not shared or persisted — inconsistent across the 2 replicas defined in `k8s/deployment.yaml`, and reset on every restart.
4. `/health/dependencies`'s external-connector checks read env-mode strings (`configured` vs `MOCK_CONNECTOR`), not live pings — same finding as the Connectors section.
5. No metrics/tracing stack (OpenTelemetry, prom-client, StatsD) exists anywhere in `api-server`.
6. Runbook procedures describing "View Operator Alerts"/"Acknowledge Alert" describe a pipeline that, per gap #2, is never actually populated by real events.

**Recommended next actions:**
- Wire `operational-events-service`'s alert creation into the real failure paths it's meant to cover (connector failure, drift detection, execution block), and persist alerts to the existing `operator_alerts` table instead of an in-memory array.
- Add at least one real alert delivery channel (Slack webhook or email) before operating with live customers — silent failure is not acceptable for financial-execution software.
- Move connector/runtime health state to the database (or Redis) so it's consistent across replicas.
- Add a minimal metrics/tracing integration (even just prom-client counters on request/error rates) as a baseline observability signal beyond logs.

---

## Tests / Commands Run

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Succeeded (487 packages) |
| `pnpm run typecheck` (workspace-wide: `lib/db`, `lib/api-zod`, `lib/api-client-react`, `artifacts/api-server`, `artifacts/control-plane`, `artifacts/mockup-sandbox`, `scripts`) | **Passed**, 0 errors |
| `pnpm run test` (`test:contoso`, `test:platform-boundaries`, `test:graph-discovery`) | **Passed**, all `node:test` suites green (tenant/session/graph/workflow/execution-cooldown tests, dist-export verification) |
| `auth-rbac.test.ts` + `economic-operations-rbac-middleware.test.ts` (run by the auth investigation) | **Passed**, 20/20 |
| `demo-live-data-boundary.test.ts` (run by the auth investigation) | **Passed**, 6/6 |
| `pnpm --filter @workspace/control-plane run build` (run by the performance investigation) | Succeeded; **reproduced the Vite >500kB chunk-size warning** (735.57 kB / 194.66 kB gzip main bundle) |

Note: automated tests pass, but they exercise unit-level and contract-level behavior. They do not cover the broken-access-control gap found in governed-execution (no test asserts that a VIEWER-role token is rejected from `/plans/:id/execute`), nor do they constitute a load test.

---

## Final Verdict

**NOT_OPERATIONALLY_READY**

All five areas landed at PARTIAL or MISSING; none reached VERIFIED. The typecheck and existing test suite are clean, and a meaningful amount of real infrastructure exists (fail-closed config validation, real Graph OAuth calls, DB-scoped tenant isolation, DB-backed health checks, structured logging). But a live-customer deployment today would carry:

- A confirmed privilege-escalation path on the governed-execution approve/execute/cancel endpoints (Security, gap #1) with no audit trail on that same path (Security, gap #2).
- No durable, encrypted credential storage for M365 connectors (in-memory token store, insecure default key) and a dry-run path that silently returns fixture data labeled `READY` (Connectors, gaps #1, #3).
- No real Microsoft Entra login flow — the production login path is a stub returning mock claims (Authentication, gap #1).
- No alerting delivery of any kind, with alert generation entirely disconnected from real failure signals (Monitoring, gaps #1–2).
- An unmitigated, reproduced performance warning and no measured load-test results despite documentation implying scale validation is complete (Performance, all gaps).

These are not edge-case nitpicks — they sit directly on the live-execution, live-credential, and incident-response paths this product needs for real customers and real money. Recommend treating the Security gap #1 (broken access control on execute/approve) and Connectors gap #1 (non-persistent credential store) as release blockers, with the remaining gaps tracked as required pre-GA follow-up work.
