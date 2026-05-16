# P1 Remediation Recon

- Date: 2026-05-16
- Current branch: `work`
- Current `main` commit: unavailable in local repo (`main` branch is not present in this checkout)
- Working tree status at recon start: clean

## Exact P1 Items Found
1. Recommendation authority logic is split between `routes/recommendations.ts` and recommendation/playbook services.
2. Tenant context still falls back to `default` in production route handlers and tenant guard resolution.
3. Telemetry route reads rely on ad-hoc tenant fallback instead of strict tenant context.
4. UI/API contract validation exists but needs explicit lifecycle/contract hardening checks for recommendation authority.
5. Execution boundary authority is partially documented, but not yet explicit in a dedicated authority doc.

## Existing Canonical Authorities
- Recommendation generation: `artifacts/api-server/src/lib/playbooks/playbook-recommendation-service.ts`
- Recommendation arbitration: `artifacts/api-server/src/lib/recommendations/recommendation-arbitration-service.ts`
- Tenant access controls: `artifacts/api-server/src/middleware/security-guards.ts`, `artifacts/api-server/src/lib/security/tenant-context.ts`
- Telemetry emission: `artifacts/api-server/src/lib/observability/operational-telemetry-service.ts`
- Execution authority: `artifacts/api-server/src/lib/execution-orchestration/execution-orchestration-service.ts`

## Files Expected to Change
- `artifacts/api-server/src/middleware/security-guards.ts`
- `artifacts/api-server/src/routes/recommendations.ts`
- `artifacts/api-server/src/routes/workflow.ts`
- `artifacts/api-server/src/routes/simulations.ts`
- `artifacts/api-server/src/routes/telemetry.ts`
- `artifacts/api-server/src/lib/security/tenant-context.ts`
- architecture docs under `docs/architecture/*`
- P1 test files under `artifacts/api-server/src/tests/*`

## Files That Must Not Be Touched
- Connector ingestion internals unrelated to tenant/lifecycle boundaries.
- Execution engine internals except documentation references.
- UI styling/layout assets (non-goal).

## Risk Areas
- Tight route/service coupling in recommendations can cause regressions while centralizing behavior.
- Strict tenant enforcement may break tests and any implicit-tenant callers.
- Boundary tests may require careful static checks to avoid false positives.
