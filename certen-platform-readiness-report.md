# Certen Platform Readiness Report
**Date:** 2026-06-13  
**Scope:** Full platform audit — no new code was written.  
**Question answered:** If a design partner signs tomorrow, what exactly works, what only partially works, and what still blocks production?

---

## Executive Summary

Certen is a production-grade **governance and proof platform** for enterprise cost optimisation. The core authority architecture — trust, approval, governed execution, outcome protection, evidence chain, and proof pack generation — is **architecturally complete and functionally correct**. The M365 wedge has a real, live Microsoft Graph API integration that can execute license reclaims against a real tenant today.

However, the platform has two absolute production blockers that must be resolved before it can serve any customer with data continuity: **there is no database** (all state is in process memory), and **only one of eight wedges has real API execution** (M365 only). All other wedges are simulated.

For a **design partner pilot on M365**, the platform is close. For any other wedge or for production, significant work remains.

---

## Overall Platform Readiness

| Dimension | Score | Notes |
|---|---|---|
| Core Authority Architecture | 9/9 complete | All authorities exist and are functionally correct |
| Certified Wedges | 0 fully certified / 8 certified with gaps | All gaps are lifecycle-evidence gaps; architecture is correct |
| Live Integrations | 1 real, 2 partial, 8 simulated/missing | M365 is real; ServiceNow + Flexera have dormant real paths |
| Pilot Readiness | READY WITH GAPS | M365 pilot can start with env var config |
| Production Readiness | NOT PRODUCTION READY | No persistence, no multi-wedge live integration |

---

## Authorities: 9/9 Complete

| Authority | Status | Location |
|---|---|---|
| Certified Wedge Registry | ✅ COMPLETE | `lib/certification/certified-wedge-registry.ts` |
| Technology Portfolio Authority | ✅ COMPLETE | `lib/technology-portfolio/technology-portfolio-authority.ts` |
| Executive Proof Pack Authority | ✅ COMPLETE | `lib/proof-pack-authority/executive-proof-pack-authority.ts` |
| Live Tenant Onboarding Authority | ✅ COMPLETE | `lib/onboarding/live-tenant-onboarding-authority.ts` |
| Trust & Readiness Authority | ✅ COMPLETE | `lib/runtime/live-tenant-safety.ts` + `lib/trust-readiness/` |
| Approval Authority | ✅ COMPLETE | `lib/approval-authority/approval-authority.ts` |
| Governed Action Lifecycle | ✅ COMPLETE | `lib/actions/governed-actions.ts` |
| Governed Execution | ✅ COMPLETE | `lib/execution/governed-execution.ts` |
| Outcome Protection | ✅ COMPLETE | `lib/outcome-protection/outcome-protection.ts` |

All authorities have routes, UI pages, and tests. All use in-memory Map stores — the logic is correct, the persistence layer is absent.

---

## Certified Wedges: 0/8 Certified, 8/8 Certified With Gaps

Certification is dynamically computed from actual lifecycle evidence (actions, executions, outcomes, protected outcomes). A fresh tenant with no executed actions will show all 8 wedges as uncertified — this is architecturally correct, not a bug. Certification is earned through real use, not declared.

| Wedge | Governance Chain | Real Execution | Verdict |
|---|---|---|---|
| **M365** | Trust ✅ Approval ✅ Rollback ✅ Verification ✅ Protection ✅ | **REAL** (Microsoft Graph API, OAuth2) | **CERTIFIED WITH GAPS** — Requires env var credentials + production mode flag |
| **AI Economic Control** | Trust ✅ Approval ✅ | SIMULATED — 4 connectors exist (OpenAI, Anthropic, Cursor, Windsurf) but return hardcoded mock data. GitHub Copilot and Gemini have no connector at all. | **CERTIFIED WITH GAPS** |
| **ServiceNow** | Trust ✅ Approval ✅ | PARTIAL — Real API path exists behind `SERVICENOW_INSTANCE_URL` env var; default is mock | **CERTIFIED WITH GAPS** |
| **Snowflake** | Trust ✅ Approval ✅ | SIMULATED — No Snowflake auth/client file; in-memory state only | **CERTIFIED WITH GAPS** |
| **Databricks** | Trust ✅ Approval ✅ | SIMULATED — No Databricks auth/client file; in-memory state only | **CERTIFIED WITH GAPS** |
| **AWS** | Trust ✅ Approval ✅ | SIMULATED — No AWS SDK; no credential file | **CERTIFIED WITH GAPS** |
| **Azure** | Trust ✅ Approval ✅ | SIMULATED — No Azure SDK | **CERTIFIED WITH GAPS** |
| **ITAM / Flexera** | Trust ✅ Approval ✅ | PARTIAL — Real API path exists behind `FLEXERA_BASE_URL` env var; default is mock | **CERTIFIED WITH GAPS** |

---

## Live Integrations: 1 Real, 2 Partial, 11 Simulated / Missing

| Integration | Status | Evidence |
|---|---|---|
| **M365 / Microsoft Graph** | **REAL** | `m365-auth.ts` acquires OAuth2 token; `m365-graph-execution.ts` calls `POST /assignLicense`; guarded by DEMO mode env var |
| **ServiceNow** | **PARTIAL** | `servicenow-client.ts` has real API path behind `SERVICENOW_INSTANCE_URL`; default is `MOCK_CONNECTOR` |
| **Flexera / ITAM** | **PARTIAL** | `flexera-client.ts` has real API path behind `FLEXERA_BASE_URL`; default is `MOCK_CONNECTOR` |
| OpenAI | SIMULATED | Hardcoded seat records; comment states "In LIVE mode, would call…" |
| Anthropic | SIMULATED | Hardcoded mock data |
| Cursor | SIMULATED | Hardcoded seat records |
| Windsurf | SIMULATED | Hardcoded seat records |
| GitHub Copilot | **MISSING** | No connector file |
| Microsoft Copilot | PARTIAL | Handled via M365 Copilot license reclaim playbook in M365 wedge — not a separate connector |
| Gemini | **MISSING** | No connector file |
| Snowflake | SIMULATED | In-memory state; no API client |
| Databricks | SIMULATED | In-memory state; no API client |
| AWS | SIMULATED | In-memory state; no AWS SDK |
| Azure | SIMULATED | In-memory state; no Azure SDK |

---

## Pilot Readiness: READY WITH GAPS

A controlled M365 pilot with one design partner is achievable. All the governance wiring exists. The execution is real (Graph API). The blockers are operational configuration, not missing code.

**What works today (demo mode):**
- Full 10-stage onboarding journey evaluates correctly
- Approval authority routes HIGH/CRITICAL actions to CAB/EXECUTIVE approval
- Trust gate evaluates connector health, scope completeness, blast radius before execution
- Evidence chain captures PRE_STATE → POST_STATE → VERIFICATION_RESULT correctly
- All 6 executive proof pack types generate with deterministic narratives
- Technology portfolio syncs from all 8 wedge ingestion functions
- Outcome protection drift detection and retention checks function correctly

**What requires configuration for M365 pilot:**

| Step | Action Required |
|---|---|
| 1 | Set `M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET` in API server environment |
| 2 | Register Azure AD app with scopes: `User.Read.All`, `Directory.Read.All`, `Organization.Read.All`, `User.ReadWrite.All` |
| 3 | Set `M365_TENANT_EXECUTION_MODE=PRODUCTION_CONTROLLED_EXECUTION` (default is DEMO, which blocks real writes) |
| 4 | Set `JWT_SECRET` (32+ character secret) |
| 5 | Set `ALLOWED_ORIGINS` to the control-plane domain |

**Exact pilot blockers:**
1. No database — all state resets on server restart. Customer cannot return the next day to find their data.
2. No customer-facing onboarding wizard — the Live Tenant Onboarding Authority evaluates stage completion, but there is no guided UI flow with explicit "do this next" CTAs.
3. Demo mode is the default with no UI flow to switch to pilot/production mode.
4. No tenant provisioning UI — `tenant-provisioning-service.ts` exists but is not surfaced.

---

## Production Readiness: NOT PRODUCTION READY

### Critical Blockers (must fix before any customer goes live)

**1. No database persistence — SEVERITY: CRITICAL**  
Every domain object (governed actions, executions, approvals, outcomes, protected outcomes, proof packs, portfolio assets) is stored in process-local `Map<string, T>` instances. A server restart destroys all customer data. `DATABASE_URL` is validated in `env.ts` but no database client is instantiated anywhere in domain code. The plumbing for a database exists in the repository layer but is never connected.

**2. No multi-wedge live execution — SEVERITY: CRITICAL for value delivery**  
M365 has real API execution. The other seven wedges run through the full governance chain but the execution step writes to in-memory Maps, not real provider APIs. A customer using Snowflake, Databricks, AWS, Azure, or ServiceNow receives governance reports but no actual execution of cost optimisations.

**3. Several significant routes lack `requireTenantContext()` — SEVERITY: HIGH**  
`/api/outcomes`, `/api/drift`, `/api/approvals`, `/api/jobs`, `/api/verification`, and the M365 onboarding endpoints in `/api/onboarding` are mounted without tenant isolation middleware. In a multi-tenant production environment this is an access control gap.

**4. Rate limiter is single-process in-memory — SEVERITY: HIGH for scale**  
`rate-limit.ts` explicitly documents: "State is local to the process. In a multi-instance deployment this does NOT share state across replicas." Any load-balanced deployment renders rate limiting ineffective.

**5. Auth sync path has a silent unauthenticated fallback — SEVERITY: MEDIUM**  
`buildAuthContextSync()` returns an anonymous VIEWER context (rather than blocking) if the async auth middleware hasn't run. A log warning is emitted but the request proceeds. This is safe for the current middleware ordering but fragile under refactoring.

**6. No automated rollback triggering — SEVERITY: MEDIUM**  
Rollback payloads are captured as evidence. Rollback re-execution when a verification fails requires manual action. There is no automated "verification failed → trigger rollback" path.

**7. No persistent drift monitoring scheduler — SEVERITY: MEDIUM**  
Drift policies exist and drift signals are detectable. However drift check execution requires an explicit API call or user interaction. There is no background scheduler polling for drift against protected outcomes.

**8. Hardcoded demo credentials in control-plane — SEVERITY: LOW (demo only)**  
`App.tsx` contains `const DEMO_EMAIL = 'demo@certen.io'` and `const DEMO_PASSWORD = 'DemoWorkspace2026!'`. These must be replaced with environment-sourced values before production.

---

## Highest Risk Areas

1. **Data loss on restart** — Every customer interaction, approval, execution, and outcome is ephemeral until a database is integrated.

2. **AI wedge has no live data** — The AI Economic Control wedge, which is commercially the highest-value proposition for many buyers, returns entirely simulated seat records. OpenAI, Anthropic, Cursor, and Windsurf connectors all use hardcoded arrays. GitHub Copilot and Gemini have no connector at all.

3. **Wedge certification requires completed evidence** — A brand-new design partner tenant has zero lifecycle evidence, so the Certified Wedge Registry reports all 8 wedges as uncertified. There is no bootstrapping, seeding, or demonstration mode that lets a prospect or onboarding team see certified status without running real executions.

4. **Navigation has two unreachable pages** — Executive Priorities (`/executive-priorities`) and Opportunities (`/opportunities`) both have routes in App.tsx but no sidebar entry. Customers cannot find them.

5. **No tenant provisioning workflow** — A new design partner cannot self-provision. There is no UI for creating a tenant, configuring pilot mode, or assigning the first connector.

---

## Top 5 Priorities Before First Customer

| Priority | Action | Effort |
|---|---|---|
| **1** | **Integrate a persistence layer** — Connect `DATABASE_URL` to a real Postgres instance. Migrate all in-memory Maps in GovernedActions, GovernedExecution, Approvals, OutcomeProtection, and ProofPacks to DB-backed repositories. This is the single gating blocker for any production use. | High |
| **2** | **Configure and test M365 pilot with real credentials** — Register an Azure AD app, configure all M365 env vars, set execution mode to `PRODUCTION_CONTROLLED_EXECUTION`, and run end-to-end: discovery → action → approval → execution → verification → proof pack. Validate the full evidence chain with real Graph API responses. | Medium |
| **3** | **Add `requireTenantContext()` to the 6 unguarded routes** — `/api/outcomes`, `/api/drift`, `/api/approvals`, `/api/jobs`, `/api/verification`, and M365 onboarding endpoints must be tenant-guarded before any multi-tenant deployment. | Low |
| **4** | **Add "Priorities" and "Opportunities" to the sidebar** — Two complete pages are currently unreachable from the main navigation. | Low |
| **5** | **Build a design partner onboarding flow** — The technical authority for tenant onboarding (`LiveTenantOnboardingAuthorityView`) evaluates stage completion correctly but provides no actionable UI pathway for a customer to progress. Build a guided wizard (or at minimum, clickable CTA links from each incomplete stage card) so a design partner can independently progress through onboarding without engineering involvement. | Medium |

---

*Audit completed: 2026-06-13. No new code was written. This report reflects the state of the codebase as audited.*
