# Foundational Gap Register

## P0
- None currently identified in this pass.

## P1
1. **Domain:** authorization-security
   - **Description:** Several routes still derive tenant from default/query values rather than strict mandatory tenant guard.
   - **Evidence:** route patterns in `routes/recommendations.ts`, `routes/telemetry.ts`, `routes/graph.ts`.
   - **Affected files/modules:** listed routes + `middleware/security-guards.ts`.
   - **Recommended fix:** enforce `requireTenantContext()` consistently and remove fallback defaults.
   - **New service required?:** No.
   - **Extend existing authority?:** Yes, extend security guard authority.

2. **Domain:** recommendation-intelligence
   - **Description:** recommendation route includes significant orchestration logic and direct DB writes.
   - **Evidence:** `routes/recommendations.ts` contains generation loop, trust, exception, and insert behavior.
   - **Affected files/modules:** `routes/recommendations.ts`, `playbook-recommendation-service.ts`.
   - **Recommended fix:** incrementally move orchestration into canonical recommendation service.
   - **New service required?:** No.
   - **Extend existing authority?:** Yes.

## P2
1. **Domain:** telemetry
   - **Description:** telemetry emission pathways are mixed between direct writes and service helpers.
   - **Evidence:** direct table query/write patterns in route handlers.
   - **Affected files/modules:** `routes/telemetry.ts`, observability modules.
   - **Recommended fix:** consolidate emission wrappers under operational telemetry service.
   - **New service required?:** No.
   - **Extend existing authority?:** Yes.

## P3
1. **Domain:** docs
   - **Description:** some legacy module names remain potentially confusing.
   - **Evidence:** overlapping names such as `workflow-orchestration-v2` vs canonical workflow operations.
   - **Affected files/modules:** authority docs and legacy helpers.
   - **Recommended fix:** deprecation annotations and naming cleanup pass.
   - **New service required?:** No.
   - **Extend existing authority?:** Yes.
