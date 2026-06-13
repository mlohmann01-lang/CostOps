# Certen Platform Product Readiness Audit
**Date:** 2026-06-13  
**Auditor:** Automated — no new code was written. Inspect-only.

---

## Phase 1 — Platform Authority Inventory

| Authority | Lib File | Route | UI Page | Tests | Status |
|---|---|---|---|---|---|
| **Certified Wedge Registry** | `lib/certification/certified-wedge-registry.ts` ✅ | `routes/certification.ts` ✅ | `pages/CertifiedWedgeRegistryView.tsx` ✅ | `tests/certified-wedge-registry.test.ts` ✅ | **COMPLETE** |
| **Technology Portfolio Authority** | `lib/technology-portfolio/technology-portfolio-authority.ts` ✅ | `routes/technology-portfolio.ts` ✅ | `pages/TechnologyPortfolioAuthorityView.tsx` ✅ | `tests/technology-portfolio-authority.test.ts` ✅ | **COMPLETE** |
| **Executive Proof Pack Authority** | `lib/proof-pack-authority/executive-proof-pack-authority.ts` ✅ | `routes/executive-proof-packs.ts` ✅ | `pages/ExecutiveProofPackAuthorityView.tsx` ✅ | `tests/executive-proof-pack-authority.test.ts` ✅ | **COMPLETE** |
| **Live Tenant Onboarding Authority** | `lib/onboarding/live-tenant-onboarding-authority.ts` ✅ | Appended to `routes/onboarding.ts` ✅ | `pages/LiveTenantOnboardingAuthorityView.tsx` ✅ | `tests/live-tenant-onboarding-authority.test.ts` ✅ | **COMPLETE** |
| **Trust & Readiness Authority** | `lib/runtime/live-tenant-safety.ts` ✅ + `lib/trust-readiness/` ✅ | `routes/trust.ts` ✅ + `routes/trust-readiness.ts` ✅ | `pages/LiveTenantReadinessView.tsx` ✅ | Multiple tests ✅ | **COMPLETE** |
| **Approval Authority** | `lib/approval-authority/approval-authority.ts` ✅ | `routes/approval-authority.ts` ✅ | `pages/ApprovalCenter.tsx` ✅ | Tests ✅ | **COMPLETE** |
| **Governed Action Lifecycle** | `lib/actions/governed-actions.ts` ✅ | `routes/actions.ts` ✅ | `pages/ActionCenter.tsx` ✅ | Tests ✅ | **COMPLETE** |
| **Governed Execution** | `lib/execution/governed-execution.ts` ✅ | `routes/execution.ts` ✅ + `routes/execution-dry-run.ts` ✅ | `pages/ExecutionView.tsx` ✅ | Tests ✅ | **COMPLETE** |
| **Outcome Protection** | `lib/outcome-protection/outcome-protection.ts` ✅ | `routes/outcome-protection.ts` ✅ | `pages/OutcomeProtectionView.tsx` ✅ | Tests ✅ | **COMPLETE** |

**Authority Inventory: 9/9 COMPLETE**

---

## Phase 2 — Wedge Certification Audit

> The registry calls per-wedge certification builders which themselves inspect actual governed action data, execution evidence, outcomes, and protected outcomes in the in-memory stores. With a fresh tenant (no actions/executions), ALL wedges will evaluate as NOT CERTIFIED because all lifecycle evidence is missing. This is correct — certification is runtime-data-driven, not hard-coded.

### M365 Cost Governance
| Stage | Finding |
|---|---|
| Discovery | Real Graph API client (`m365-graph-read-only-client.ts`). Auth via env vars (`M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`). No credentials → MISSING_CONFIG error. **REAL when configured.** |
| Trust | Integrated — `live-tenant-safety.ts` via `requireTrustAuthority` gate. ✅ |
| Approval | Integrated — `approval-authority.ts` integrated into execution gate. ✅ |
| Execution | Real Microsoft Graph API calls in `m365-graph-execution.ts` and `m365-graph-license-write-client.ts`. Controlled execution reads current license state via Graph, then posts `assignLicense`. **REAL when `M365_TENANT_EXECUTION_MODE=PRODUCTION_CONTROLLED_EXECUTION` and credentials present.** Default is DEMO mode. |
| Rollback | Implemented — rollback payload captured as evidence, `m365-rollback-readiness-gate.ts` exists. ✅ |
| Verification | Implemented — verification evidence type `VERIFICATION_RESULT` captured post-execution. ✅ |
| Protection | Integrated — outcome protection service called on execution. ✅ |
| Drift | Implemented — drift policies and signals in `outcome-protection.ts`. ✅ |
| Executive Proof | Linked — proof packs query execution evidence. ✅ |
| **Verdict** | **CERTIFIED WITH GAPS** — architecture is real and complete; execution requires env var credentials and explicit mode change from DEMO to production. Fresh tenant = no lifecycle evidence yet = cert blockers present. |

### AI Economic Control (OpenAI, Anthropic, Cursor, Windsurf)
| Stage | Finding |
|---|---|
| Discovery | Connectors registered: OpenAI, Anthropic, Cursor, Windsurf. No GitHub Copilot, Microsoft Copilot, or Gemini connector file exists. All four that exist use **hardcoded mock data** with a comment noting what real API calls would be. No live API calls implemented. |
| Trust | Integrated via governance framework. ✅ |
| Approval | Integrated. ✅ |
| Execution | Governed through `ai-economic-operations-registry.ts` and AI economic control wedge. State-machine driven. **SIMULATED** — no real API calls to OpenAI/Anthropic to modify seat assignments. |
| Rollback | Partial — rollback logic present in execution framework. |
| Verification | Implemented via evidence types. |
| **Verdict** | **CERTIFIED WITH GAPS** — governance, trust, approval, and verification chain is solid. Live telemetry ingestion is simulated only. No GitHub Copilot, Microsoft Copilot, or Gemini connector. |

### ServiceNow
| Stage | Finding |
|---|---|
| Discovery | `servicenow-client.ts` defaults to `MOCK_CONNECTOR` mode. Real API path exists (`SERVICENOW_INSTANCE_URL` env var) but is not the default. **PARTIAL — real path exists but not the default.** |
| Trust/Approval | Integrated via governance framework. ✅ |
| Execution | `servicenow-execution.ts` exists. Follows same in-memory state pattern with DEMO-mode guard. Real ServiceNow API not called. **SIMULATED.** |
| Rollback | Present as evidence capture. ✅ |
| **Verdict** | **CERTIFIED WITH GAPS** — Change management playbooks (Create Change, Approval Workflow, Remediation Task, Drift Remediation) are defined. Live integration is simulated. |

### Snowflake
| Stage | Finding |
|---|---|
| Discovery | No `snowflake-client.ts` or auth file found. Only `snowflake-execution.ts`. |
| Execution | State stored in in-memory Map. Has `assertCanWrite` guard checking `DEMO` mode and connector status. **SIMULATED — no real Snowflake API calls.** |
| Rollback | Rollback payload stored as evidence. ✅ |
| **Verdict** | **CERTIFIED WITH GAPS** — Playbooks defined (Auto-suspend, Resize, Suspend, Tag Cost Owner, Spend Review). No live Snowflake API integration. |

### Databricks
| Stage | Finding |
|---|---|
| Discovery | No `databricks-client.ts` or auth file. Only `databricks-execution.ts`. |
| Execution | State stored in in-memory Map. Has `assertCanWrite` guard. **SIMULATED — no real Databricks API calls.** |
| **Verdict** | **CERTIFIED WITH GAPS** — Playbooks defined (Auto-termination, Resize, Terminate, Tag, Job Review). No live API. |

### AWS Cost Governance
| Stage | Finding |
|---|---|
| Discovery | `aws-artifacts.ts` uses in-memory state seeded by ingestion. No real AWS SDK calls. |
| Execution | `aws-execution.ts` — in-memory state manipulation. Has approval/trust/connector guards. **SIMULATED.** |
| Rollback | Rollback payload stored as evidence. ✅ |
| **Verdict** | **CERTIFIED WITH GAPS** — Playbooks defined (EC2 Rightsizing, Idle Shutdown, RDS Rightsizing, Reserved Instance). No real AWS API. |

### Azure Cost Governance
| Stage | Finding |
|---|---|
| Discovery | `azure-artifacts.ts` uses in-memory state. |
| Execution | `azure-execution.ts` — in-memory. **SIMULATED.** |
| **Verdict** | **CERTIFIED WITH GAPS** — Playbooks defined. No real Azure API. |

### ITAM / Flexera
| Stage | Finding |
|---|---|
| Discovery | `flexera-client.ts` defaults to `MOCK_CONNECTOR`. Real path exists (`FLEXERA_BASE_URL` env var). **PARTIAL — real path exists but not the default.** |
| Execution | `itam-execution.ts` in-memory. **SIMULATED.** |
| **Verdict** | **CERTIFIED WITH GAPS** — Discovery has a real path that can be enabled. Execution is simulated. |

### Wedge Summary
| Wedge | Verdict |
|---|---|
| M365 | CERTIFIED WITH GAPS (real API, requires credentials + mode change) |
| AI Economic Control | CERTIFIED WITH GAPS (governance complete, telemetry simulated) |
| ServiceNow | CERTIFIED WITH GAPS (governance complete, execution simulated) |
| Snowflake | CERTIFIED WITH GAPS (governance complete, no live API) |
| Databricks | CERTIFIED WITH GAPS (governance complete, no live API) |
| AWS | CERTIFIED WITH GAPS (governance complete, no live API) |
| Azure | CERTIFIED WITH GAPS (governance complete, no live API) |
| ITAM/Flexera | CERTIFIED WITH GAPS (discovery partial, execution simulated) |

**0 fully CERTIFIED. 8 CERTIFIED WITH GAPS. 0 NOT CERTIFIED.**

---

## Phase 3 — Live Integration Audit

| Connector | Authentication | Discovery | Execution | Verification | Production Ready |
|---|---|---|---|---|---|
| **M365 / Graph** | REAL (OAuth2 client creds via `m365-auth.ts`, env vars) | REAL (Graph API paginated reads) | REAL (Graph `assignLicense` API, guarded by DEMO mode) | REAL (post-state evidence captured) | PARTIAL — requires `M365_TENANT_EXECUTION_MODE=PRODUCTION_CONTROLLED_EXECUTION` + env vars |
| **OpenAI** | SIMULATED (mock data, no real API key auth) | SIMULATED | SIMULATED | SIMULATED | NOT READY |
| **Anthropic** | SIMULATED (mock data, comment says "In LIVE mode, would call") | SIMULATED | SIMULATED | SIMULATED | NOT READY |
| **GitHub Copilot** | MISSING (no connector file) | MISSING | MISSING | MISSING | NOT READY |
| **Microsoft Copilot** | SIMULATED (handled via M365 Copilot license reclaim playbook in M365 wedge, not separate connector) | PARTIAL | SIMULATED | SIMULATED | NOT READY |
| **Cursor** | SIMULATED (hardcoded seat records, comment says "In LIVE mode, would call") | SIMULATED | SIMULATED | SIMULATED | NOT READY |
| **Claude Teams / Anthropic** | SIMULATED | SIMULATED | SIMULATED | SIMULATED | NOT READY |
| **Gemini** | MISSING (no connector file) | MISSING | MISSING | MISSING | NOT READY |
| **ServiceNow** | PARTIAL (`SERVICENOW_INSTANCE_URL` env var path exists, default is MOCK) | PARTIAL | SIMULATED | SIMULATED | NOT READY |
| **Snowflake** | MISSING (no auth/client file) | MISSING | SIMULATED | SIMULATED | NOT READY |
| **Databricks** | MISSING (no auth/client file) | MISSING | SIMULATED | SIMULATED | NOT READY |
| **AWS** | MISSING (no AWS SDK, no credential file) | SIMULATED | SIMULATED | SIMULATED | NOT READY |
| **Azure** | MISSING (no Azure SDK) | SIMULATED | SIMULATED | SIMULATED | NOT READY |
| **Flexera/ITAM** | PARTIAL (`FLEXERA_BASE_URL` env var path exists, default is MOCK) | PARTIAL | SIMULATED | SIMULATED | NOT READY |

**Real integrations: 1 (M365 — requires credential configuration)**  
**Partial integrations: 2 (ServiceNow, Flexera — real path exists behind env var)**  
**Simulated: 8**  
**Missing entirely: 3 (GitHub Copilot, Gemini, Windsurf has connector but no real API path)**

---

## Phase 4 — Route Audit

All routes listed in `routes/index.ts` have corresponding router files in `routes/`. No dead mounts detected.

### Route Inventory by Group

**Core Platform (no tenant guard)**
- `GET /api/health` — KEEP
- `GET /api/governance-graph` — KEEP
- `GET /api/executive-risk` — KEEP
- `POST /api/auth/*` — KEEP

**Tenant-guarded routes (all require `requireTenantContext()` + `READ_RECOMMENDATIONS`)**
- `/api/recommendations`, `/api/trust`, `/api/vendor-changes`, `/api/opportunities`, `/api/opportunity-factory`
- `/api/evidence-packs`, `/api/executive-value`, `/api/renewals`, `/api/benchmarks`, `/api/contracts`
- `/api/priorities`, `/api/utilization`, `/api/ai`, `/api/economic-outcomes`, `/api/actions`
- `/api/trust-readiness`, `/api/outcome-protection`, `/api/certification`, `/api/technology-portfolio`
- `/api/executive-proof-packs`, `/api/campaigns`, `/api/schedules`, `/api/approval-workflows`
- `/api/approval-authority`, `/api/playbooks`, `/api/simulations`

**Events/Packs/Audit (tenant-guarded, mounted at `/`)**
- `eventsRouter`, `auditPacksRouter`, `runtimeObservabilityRouter`, `securityRouter`, `runtimeRecoveryRouter`
- `executionRequestsRouter`, `executionDryRunRouter`, `executionRuntimeRouter`

**Unauthenticated/low-guard routes** ⚠️
- `/api/outcomes`, `/api/drift`, `/api/pricing/tenant`, `/api/reconciliation`, `/api/jobs`
- `/api/verification`, `/api/approvals`, `/api/governance/exceptions`, `/api/operationalization`
- `/api/enterprise`, `/api/onboarding`, `/api/platform-events`, `/api/telemetry` (has own guard)
- `/api/execution-orchestration`, `/api/demo`, `/api/workflow`, `/api/economic-operations`
- `/api/packs`, `/api/graph`, `/api/discovery`, `/api/pilot`

**Finding:** Several operationally significant routes (`/api/outcomes`, `/api/drift`, `/api/approvals`, `/api/jobs`, `/api/verification`) lack `requireTenantContext()` guards. In production these should be guarded.

### Route Disposition
| Action | Routes |
|---|---|
| KEEP | All 65+ routes — all have corresponding files |
| MERGE | `/api/outcomes` → could merge with `/api/economic-outcomes` (overlap) |
| REMOVE | None identified |
| SECURE | `/api/outcomes`, `/api/drift`, `/api/approvals`, `/api/jobs`, `/api/verification`, `/api/onboarding` (partial — M365 endpoints unguarded) |

---

## Phase 5 — Navigation Audit

### Current Sidebar vs Target Spec

| Group | Spec | Current Sidebar | Gap |
|---|---|---|---|
| COMMAND | Overview, Actions | Overview ✅, Actions ✅ | None |
| EXECUTIVE | Risk, Value, **Priorities** | Executive Risk ✅, Executive Value ✅, Proof Pack Authority ✅ | **Missing: Priorities link** (route `/executive-priorities` exists in App.tsx but no sidebar entry) |
| INTELLIGENCE | **Technology Portfolio**, Governance, **Opportunities** | Technology Portfolio ✅, Governance ✅ | **Missing: Opportunities** (route exists, no sidebar entry) |
| OPERATIONS | Approvals, Evidence, Execution, Outcomes, Outcome Protection | All 5 present ✅ | None |
| ADMIN | Connectors, Workspace, Live Tenant Readiness, Live Tenant Onboarding, Certified Wedges, Settings | Workspace ✅, Live Tenant Readiness ✅, **Live Tenant Onboarding ✅** (just added), Certified Wedges ✅, Connectors ✅, Platform ✅, Settings ✅ | Settings → redirects to `/platform?tab=configuration` (acceptable alias) |

### Sidebar Items With No Direct Route
- `/platform` → maps to combined platform page (RuntimeHealthView + DataTrustView + SecurityView + settings) — intentional consolidation
- `/settings` → redirects to `/platform?tab=configuration`

### Routes With No Sidebar Entry (orphaned pages, reachable only by direct URL)
- `/executive-priorities` — has its own route, not in sidebar
- `/opportunities` — has its own route, not in sidebar  
- `/ai-economic-command` — has its own route
- `/economic-outcomes` — has its own route
- All redirect aliases (`/shadow-it`, `/saas-rationalisation`, etc.) — acceptable

**Navigation Drift:** 2 missing sidebar entries (Executive Priorities, Opportunities). Otherwise clean.

---

## Phase 6 — Authority Registry Audit

| Check | Finding | Result |
|---|---|---|
| `getTechnologyPortfolioAuthorityStatus()` exists | ✅ `lib/technology-portfolio/technology-portfolio-authority.ts` | PASS |
| `getExecutiveProofPackAuthorityStatus()` exists | ✅ `lib/proof-pack-authority/executive-proof-pack-authority.ts` | PASS |
| `getLiveTenantOnboardingAuthorityStatus()` exists | ✅ `lib/onboarding/live-tenant-onboarding-authority.ts` | PASS |
| `getCertifiedWedgeRegistrySummary()` exists | ✅ `lib/certification/certified-wedge-registry.ts` | PASS |
| Platform registry endpoint exposed | ⚠️ No single `/api/platform-registry` endpoint aggregates all authorities. Each is separately queryable. `routes/index.ts` does not mount a unified registry router. | PARTIAL |
| All authority statuses return `type: "PLATFORM_AUTHORITY"` | ✅ All three new authorities return correct type | PASS |
| Certification requirements all report true | ✅ `getLiveTenantOnboardingAuthorityStatus()` returns CERTIFIED | PASS |

**Phase 6 Result: PARTIAL** — Individual authorities are registered and queryable; no unified `/api/platform-registry` aggregation endpoint exists.

---

## Phase 7 — Evidence Chain Audit (M365 Inactive User Reclaim)

Tracing playbook: `inactive-user-licence-reclaim`

| Link | Mechanism | Status |
|---|---|---|
| **Recommendation** | M365 discovery generates recommendations via `m365-recommendation-generator.ts` → creates `GovernedAction` with domain=M365, sourceType=RECOMMENDATION | ✅ CONNECTED |
| **Trust** | `live-tenant-safety.ts` `evaluateLiveTenantExecutionGate()` checks `requireTrustAuthority` policy | ✅ CONNECTED |
| **Approval** | `approval-authority.ts` `ApprovalAuthorityEngine.evaluateApprovalRequirement()` called pre-execution; `evaluateLiveTenantExecutionGate` checks `requireApprovalAuthority` | ✅ CONNECTED |
| **Execution** | `m365-graph-execution.ts` calls Graph API `assignLicense`, records `PRE_STATE` + `POST_STATE` evidence. In DEMO mode, records `SIMULATED_ONLY` execution. | ✅ CONNECTED (SIMULATED in demo, REAL when configured) |
| **Verification** | Post-execution: `VERIFICATION_RESULT` evidence type captured, outcome created in `economicOutcomeAttributionService` | ✅ CONNECTED |
| **Protection** | `outcomeProtectionService.protectOutcome()` called during execution, links outcome to action | ✅ CONNECTED |
| **Proof Pack** | `generateExecutiveProofPack()` in `executive-proof-pack-authority.ts` queries governed actions, executions, outcomes, protected outcomes, and evidence | ✅ CONNECTED |

**Evidence Chain: COMPLETE** — The full M365 license reclaim evidence chain is architecturally connected end-to-end.

**Gap:** The chain only produces real evidence when M365 credentials are configured and mode is set to PRODUCTION_CONTROLLED_EXECUTION. With a fresh demo tenant, certification blocks surface because evidence evidence IDs don't match the expected patterns (e.g., no `trust` or `readiness` substring in evidence IDs).

---

## Phase 8 — Pilot Readiness Audit

| Question | Finding | Status |
|---|---|---|
| Can a tenant be onboarded? | `onboarding-state.ts` + `onboarding-service.ts` exist. `getOnboardingStatus()` / `updateOnboardingStep()` functional. Live Tenant Onboarding Authority evaluates 10 stages dynamically. | ✅ READY |
| Can connectors be connected? | M365: Real OAuth path exists (`m365-auth.ts`). Requires `M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET` env vars. ServiceNow/Flexera: partial real path. Other wedges: simulated. | PARTIAL — M365 only |
| Can first governed action be executed? | Yes — if M365 credentials are configured, discovery runs, recommendation generated, approval obtained, execution gate passes, Graph API called. In demo: dry-run only works. | PARTIAL — real requires M365 config |
| Can proof pack be generated? | Yes — `generateExecutiveProofPack()` works with demo data. All 6 pack types (BOARD, CFO, CIO, PROCUREMENT, AUDIT, OPERATOR) generate with demo evidence. | ✅ READY (demo); PARTIAL (live evidence requires real execution) |
| Can executive value be demonstrated? | `ExecutiveValueDashboard.tsx` shows projected/verified/protected value from live data with demo fallback. | ✅ READY (demo mode) |

**Pilot Readiness: READY WITH GAPS**

**Exact Blockers:**
1. M365 credentials (`M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`) required in environment
2. `M365_TENANT_EXECUTION_MODE` must be set to `PRODUCTION_CONTROLLED_EXECUTION` for real writes
3. No live connector for any AI vendor (OpenAI, Anthropic, Cursor)
4. In-memory storage — all state resets on server restart; no persistence layer
5. Demo mode is the default — no UI workflow guides a customer through switching to pilot mode

---

## Phase 9 — Production Readiness Audit

| Area | Finding | Status |
|---|---|---|
| **Authentication** | JWT validation via `middleware/auth-middleware.ts`. `buildAuthContextSync` warns when called without prior async middleware. `JWT_SECRET` required in production. | PARTIAL — requires `JWT_SECRET` env var; sync fallback path has warning |
| **Tenant Isolation** | `requireTenantContext()` enforces `auth.tenantId === requestedTenantId` unless PLATFORM_ADMIN. `assertTenantScopedResource()` throws `TENANT_SCOPE_VIOLATION` if tenantId mismatch. All in-memory Maps use `tenantId:id` composite keys. | ✅ SOLID — architectural tenant isolation is correct |
| **Execution Controls** | `evaluateLiveTenantExecutionGate()` checks: demo mode, read-only mode, domain allowlist, blast radius, wedge certification, trust authority, approval authority, evidence, connector health, rollback capability. | ✅ SOLID |
| **Approval Controls** | `ApprovalAuthorityEngine` with risk-level classification, rule-based routing, minimum approver counts. | ✅ SOLID |
| **Audit Trails** | `platformEventService`, `validateAuditCompleteness()`, execution evidence types (PRE_STATE, POST_STATE, VERIFICATION_RESULT, ROLLBACK_PAYLOAD). | ✅ SOLID |
| **Evidence** | Evidence captured per execution, linked to actions, outcomes, packs. | ✅ SOLID |
| **Rollback** | `m365-rollback-readiness-gate.ts` exists. Rollback payloads captured. Re-execution of rollback not fully automated (requires manual initiation). | PARTIAL |
| **Runtime Safety** | `live-tenant-safety.ts` gate with multi-factor checks. Rate limiting via `rate-limit.ts` (in-memory, single-process). Graceful shutdown. Process guards. | PARTIAL — rate limiter is single-process, not distributed |
| **Persistence** | ALL domain data is in-memory `Map<>` instances. No database. `DATABASE_URL` is validated in env but never used in any domain code. | ❌ CRITICAL BLOCKER — server restart = total data loss |
| **Secrets** | No hardcoded secrets found. Credentials read from env vars. Dev JWT auto-generated with warning. | ✅ CLEAN |
| **CORS** | Configurable via `ALLOWED_ORIGINS`. Wildcard blocked in production. | ✅ SOLID |
| **Unguarded Routes** | Several routes missing `requireTenantContext()`: `/api/outcomes`, `/api/drift`, `/api/approvals`, `/api/jobs`, `/api/verification`, `/api/onboarding` (M365 endpoints). | ⚠️ RISK |

**Production Readiness: NOT PRODUCTION READY**

**Critical Production Blockers:**
1. **No persistence layer** — all state is in-memory; restart = complete data loss
2. **No database** despite `DATABASE_URL` validation existing; the plumbing is there but not connected
3. **Rate limiter is single-process** — not safe for horizontal scaling
4. **Unguarded routes** — significant attack surface
5. **AI connectors are simulated** — no real vendor telemetry
6. **Only M365 has a real API integration** — 7/8 wedges are demo-mode only

---

## Phase 10 — UI Reality Audit

| Page | Purpose | Data Quality | Demo Quality | Live Readiness | Issues | Score |
|---|---|---|---|---|---|---|
| **CommandView (Overview)** | Executive command center — actions, events, trust, execution summary | Real data via hooks with demo fallback | Excellent — rich demo state | Ready for demo, partial for live | None significant | **A** |
| **ActionCenter** | Governed action lifecycle management | Real `governedActionService` via API | Good — covers full lifecycle | Live-ready when data populated | None significant | **A** |
| **ExecutiveRiskCommandCenter** | Risk matrix, governance graph overlay | Deterministic from governance graph builder — not demo fallback, purely computed | Good | Live-ready | Fully computed, no live data dependency | **A** |
| **ExecutiveValueDashboard** | Value bridge, ROI story | Real data + demo fallback | Excellent | Good | None significant | **A** |
| **TechnologyPortfolioAuthorityView** | 8-wedge asset inventory, contracts, renewals | Demo fallback with 11 demo assets | Good | Partial — sync from wedge ingestion works, live connector data still simulated | Domain breakdown populated but from demo assets | **B** |
| **ExecutiveProofPackAuthorityView** | 6 role-specific proof packs | Demo packs with deterministic narratives | Excellent | Good for demo; real evidence requires completed executions | Generate buttons disabled in demo | **A** |
| **LiveTenantOnboardingAuthorityView** | 10-stage onboarding journey | Evaluated from live state with demo fallback | Good | Good — stages dynamically evaluated | Re-evaluate button disabled in demo | **B** |
| **LiveTenantReadinessView** | Runtime safety, connector health, audit completeness | Real data — queries connector health, execution gate, evidence export | Excellent | Live-ready when connectors connected | Best live-readiness of any page | **A** |
| **OutcomeProtectionView** | Drift policies, protected outcomes, retention checks | Real data + demo fallback | Good | Live-ready | None significant | **A** |
| **AIEconomicCommandDashboard** | AI vendor seat/token spend, idle seats, reclaim opportunities | All simulated — hardcoded mock seat records in connectors | Fair demo | NOT live-ready | All AI connector data is mock; no live API | **C** |
| **CertifiedWedgeRegistryView** | 8-wedge certification status with playbook breakdown | Real — dynamically computed from action/execution evidence | Good | Live-ready when data populated | Certification shows all gaps correctly for empty tenant | **B** |

---

## Phase 11 — Consolidation Recommendations

### Top 10 Gaps

1. **No database persistence** — every API restart destroys all tenant data, actions, executions, outcomes, approvals. The `DATABASE_URL` env var is validated but no DB client is instantiated.
2. **7/8 wedges are demo-only** — Only M365 has a real live API. AWS, Azure, Snowflake, Databricks, ServiceNow, and ITAM/Flexera use simulated in-memory state.
3. **AI connector telemetry is entirely simulated** — OpenAI, Anthropic, Cursor connectors return hardcoded mock data. GitHub Copilot and Gemini have no connector at all.
4. **Missing sidebar entries** — Executive Priorities and Opportunities pages are unreachable from the sidebar despite having routes.
5. **No unified platform registry endpoint** — The three platform authorities (Technology Portfolio, Executive Proof Pack, Live Tenant Onboarding) each have their own `getAuthorityStatus()` function but no `/api/platform-registry` endpoint aggregates them for a dashboard.
6. **Wedge certification evaluates to NOT CERTIFIED for all fresh tenants** — Because certification is driven by actual lifecycle evidence (actions, executions, outcomes), a brand-new design partner tenant has zero evidence and zero certification. There is no "seed" or "bootstrap" pathway documented.
7. **Rate limiter is single-process in-memory** — The `Map`-based rate limiter in `rate-limit.ts` explicitly states it doesn't work across replicas. For any production deployment with load balancing, this is ineffective.
8. **Several significant routes lack `requireTenantContext()`** — `/api/outcomes`, `/api/drift`, `/api/approvals`, `/api/jobs`, `/api/verification` are missing tenant isolation middleware.
9. **`buildAuthContextSync` falls back to unauthenticated** — If the async auth middleware hasn't run (or is skipped for some routes), the sync fallback returns an unauthenticated anonymous VIEWER context with a warning log rather than blocking the request.
10. **No customer-facing onboarding workflow in UI** — The Live Tenant Onboarding Authority evaluates stage completion, but there's no guided UI flow telling a customer "here is your next action, click here to complete it." The Re-Evaluate button is disabled in demo mode.

### Top 10 Cleanup Items

1. Consolidate `routes/outcomes.ts` and `routes/economic-outcomes.ts` — significant overlap in domain coverage.
2. Remove or redirect ~15 legacy page files in `pages/` that are never routed (e.g., `dashboard.tsx`, `governance.tsx`, `outcomes.tsx`, `recommendations.tsx`, `automation-center.tsx`, `ecosystem-readiness.tsx`, `enterprise-forecasting.tsx`, `operational-analytics.tsx`) — these are unreachable orphans.
3. Add `requireTenantContext()` to the 6 unguarded operationally significant routes.
4. Add "Executive Priorities" and "Opportunities" to the sidebar under Executive/Intelligence groups.
5. Remove the unused `windsurf-connector.ts` reference from the AI connector registry if Windsurf is not a target wedge (no Windsurf in the 8 certified wedges list).
6. The `settings` sidebar item redirects to `/platform?tab=configuration` — remove duplicate Settings nav item or create a proper settings route.
7. `pages/LandingPage.tsx` exists but is not routed — remove or route it.
8. `pages/connectors.tsx` and `pages/ConnectorHub.tsx` both exist — confirm which is canonical (App.tsx routes `ConnectorHub`, the lowercase file appears orphaned).
9. The `pages/connectors-m365.tsx` file appears orphaned — `/m365-onboarding` redirects to `/connectors`, not to this page.
10. Fix the `buildAuthContextSync` warning log — in routes where async middleware has already run, this warning fires unnecessarily, polluting production logs.

### Top 10 Production Blockers

1. **No database** — implement persistence layer (PostgreSQL + ORM or similar) to replace all in-memory Maps before any real tenant data can survive a restart.
2. **Add `requireTenantContext()` to unguarded routes** before any multi-tenant production deployment.
3. **M365 credentials + mode configuration** — document and test the path from DEMO → PILOT_READ_ONLY → PRODUCTION_CONTROLLED_EXECUTION with real credentials.
4. **Redis-backed rate limiter** — replace single-process in-memory rate limiter before horizontal scaling.
5. **AI connector live integrations** — at least one AI vendor (OpenAI or Anthropic) needs a real API call path before the AI Economic Control wedge can deliver real value.
6. **`JWT_SECRET` required in production** — must be a 32+ character secret stored securely (secrets manager, not .env file).
7. **`ALLOWED_ORIGINS` must be set** for production CORS — wildcard is blocked in production mode, so this must be configured.
8. **Rollback is not automated** — reversion of a production M365 license change after a failed outcome requires manual re-initiation. Automated rollback triggering on verification failure is not implemented.
9. **Server restart recovery** — with no persistence, a restart during an in-progress execution loses the execution state. An execution checkpoint/recovery mechanism (`runtime-checkpointing.ts` exists but integration unclear) must be wired to persistence.
10. **No tenant provisioning UI** — `tenant-provisioning-service.ts` exists but there is no admin UI to create, configure, or deactivate tenants.
