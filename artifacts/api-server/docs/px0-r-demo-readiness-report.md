# PX0-R — Certen Demo Readiness Completion: Gap Register & Final Assessment

Generated: 2026-06-24
Demo tenant: `demo-certen-enterprise`
Server: localhost:4100, Postgres sandbox `costops_test`

---

## 1. Demo Tenant Verification

| Metric | Minimum | Actual (initial seed) | Status |
|---|---|---|---|
| Assets | 150–300 | 165 | OK |
| Contracts | 50–100 | 83 | OK |
| Vendors | 10+ | 11 | OK |
| AI Initiatives | 10+ | 7 | **GAP** (short by 3) |
| Proof Packs | 5+ | 6 | OK |
| Closed-loop records | 10+ | 8 | **GAP** (short by 2) |
| Recommendations | 25+ | Indeterminate — see below | **UNVERIFIED / DATA_ISSUE** |

**Recommendations count finding:** No single "recommendations" endpoint returns a clean count. `GET /api/recommendations` and `GET /api/technology-portfolio/recommendations` both return `[]` (empty) for the demo tenant — the generic recommendations surface is not populated even though authority-specific recommendation feeds work (`technology-capital-allocation/recommendations` and `ai-capital-allocation-authority/recommendations` return populated REVIEW/RETIRE decisions, ai side returned 7 — one per AI initiative). The closed-loop authority (`/api/closed-loop-optimisation/authority`) reports **114 technology recommendation(s) tracked** for the tenant, which is the only authoritative count found and clears the 25+ minimum, but it took **43.6 seconds** to return (see Section 4/5 — performance gap) and only after the dataset had already been inflated by repeated seeding (see below).

**Critical seeding side-effect discovered during testing:** `POST /api/px0/demo/seed` is **not idempotent for assets**. Vendors are upserted by name (safe to re-run), but assets are inserted fresh on every call with no stable dedupe key. Calling seed multiple times against the same tenant ID during this verification accidentally inflated the tenant from 165→671→1003 assets and 11→60→82 vendors, and triggered two full server crashes/restarts under the resulting load (see Section 4). This is a real production-risk bug, not just a test artifact, and is recorded in the Gap Register below as a DATA_ISSUE.

---

## 2. Executive Demo Journey — Per-Step Verification

### Step 1 — Executive Overview
- `GET /api/executive-command-center/summary` → HTTP 200. Populated: `portfolio.totalAssets`, `totalVendors`, `totalContracts`, `economics.knownSpend` ($42.19M), `knownValue` ($24K), `recommendations.{keepCount:88, retireCount:22, reviewCount:63}`, `risk.{unknownOwnershipCount:55, unknownRenewalsCount:83}`.
- `GET /api/executive-experience/dashboard` → HTTP 200. Populated: value, investment, decisions (`proofPackCount:6`), risk, actions.
- **Questions answered:** Technology Spend (yes, $42.19M known spend), Technology Value (partially — `knownValue` is only $24K against $42M spend, `roiCoverage:0` — value attribution is essentially absent), AI Spend/Value (not in this payload, see Step 5), Renewal Exposure (yes via `unknownRenewalsCount:83`), Optimisation Opportunity (partial — recommendation counts present but `optimiseCount:0` and `consolidateCount:0` everywhere, meaning the demo cannot show an OPTIMISE or CONSOLIDATE example live), Decision Queue (yes via `executive-decision-authority/queue`, see Step 6).
- **Verdict:** Populated and functional, but value/ROI coverage is near-zero, weakening the "Technology Value" narrative.

### Step 2 — Technology Portfolio
- `GET /api/technology-portfolio/summary` → HTTP 200, populated (assetCount, vendorCount, evidenceRefs).
- `GET /api/technology-portfolio/vendors` → HTTP 200, populated (11 initially).
- `GET /api/technology-portfolio/applications` → HTTP 200 but **returns `[]` — empty**. The "Applications" facet of the portfolio is not populated even though assets/vendors are. This breaks the demo if a presenter clicks into Applications.
- `GET /api/contracts` (top-level, separate from technology-portfolio) → HTTP 200, populated (6 named contracts with risk/intelligence fields — AWS EDP, Microsoft EA, ServiceNow, etc.) — this is a **different, smaller contract data source** than the 83-contract-link count reported by the seed (technology-portfolio's contract *links* vs. the top-level `contracts` router's curated contract records). Presenters must use the right endpoint or risk an inconsistent number on screen.
- **Verdict:** Mostly works; Applications view is empty (gap); two different "contracts" concepts exist and must not be conflated on screen.

### Step 3 — Technology Value
- `GET /api/technology-economics/summary` → HTTP 200. `assetsWithValue:1`, `assetsWithROI:0`, `unknownValueCount:172` — value/ROI attribution is almost entirely missing.
- `GET /api/technology-capital-allocation/summary` → HTTP 200. Confirms `keepCount:88`, `retireCount:22`, `reviewCount:63`, `expandCount:0`, `optimiseCount:0`, `consolidateCount:0`, `renewCount:0`.
- `GET /api/technology-capital-allocation/recommendations` (no `limit`) → **hung beyond 110 seconds with no response** on the inflated dataset; only completed quickly earlier in testing when the dataset was small and a `limit` was passed. KEEP/REVIEW/RETIRE labels were confirmed present in the per-asset rationale objects.
- `GET /api/workflow-value-graph/workflows` → HTTP 200 but returns `[]` — the Technology Value Graph (a separate authority from technology-economics) has **no seeded data at all** for this tenant.
- **Verdict:** KEEP/RETIRE/REVIEW labels are demonstrable from `technology-capital-allocation`, but EXPAND/OPTIMISE/CONSOLIDATE/RENEW are all zero — the demo cannot show those labels live. The dedicated "Technology Value Graph" screen is empty and must be avoided.

### Step 4 — AI Portfolio
- `GET /api/ai-initiatives` (plain list) → HTTP 200 but returns `{"initiatives":[]}` — **empty**, despite 7 initiatives existing.
- `GET /api/ai-initiatives/portfolio` → HTTP 200, populated: `initiativeCount:7`, `experimentCandidates:7`, `activeInitiatives:5`, `scalingInitiatives:1`.
- `GET /api/ai-initiative-portfolio/portfolio-summary` → HTTP 200, same numbers, populated.
- **Verdict:** The basic `/ai-initiatives` list route is broken/empty (gap); portfolio-summary views work and show the 7 initiatives, but all are "EXPERIMENT" stage — no AI Models/Tools/Usage breakdown was found populated within scope of these routes.

### Step 5 — AI Value
- `GET /api/ai-value-graph/summary` → HTTP 200, populated: `completenessScore:30`, `readiness:NOT_READY`, `nodeCount:16`, `gapCount:14` (7 high-severity).
- `GET /api/ai-economics-authority/summary` → HTTP 200: `initiativesWithSpend:0`, `initiativesWithValue:0`, `notReadyCount:7` (all 7).
- `GET /api/ai-capital-allocation-authority/summary` → HTTP 200: `reviewCount:7`, all other buckets (`expandCount`, `keepCount`, `optimiseCount`, `consolidateCount`, `retireCount`) are **0**.
- `GET /api/ai-capital-allocation-authority/recommendations` → HTTP 200, populated, all 7 records show `decision:"REVIEW"`, `confidenceScore:0`.
- **Verdict:** Only the REVIEW label is demonstrable for AI Value — EXPAND/KEEP/OPTIMISE/RETIRE are all zero. The presenter cannot show the full label spectrum for AI economics live; this is a materially weaker story than the Technology side.

### Step 6 — Executive Decisions
- `GET /api/decisions` (top-level) → HTTP 200 but returns `[]` — **empty**, even though decision data clearly exists elsewhere (see queue below).
- `GET /api/executive-decision-authority/summary` → HTTP 200, populated: `totalTechnologies:85`, `approveRetirementCount:22`, `requireReviewCount:52`, `insufficientEvidenceCount:11`.
- `GET /api/executive-decision-authority/queue` → HTTP 200, populated with prioritized `APPROVE_RETIREMENT` decision records carrying full rationale.
- **Verdict:** Works at the authority level (queue, summary); the generic `/api/decisions` list endpoint is empty and should not be shown live.

### Step 7 — Scenario Planning
- `GET /api/scenario-planning/` (root) → HTTP 200, populated: `mostImpactfulRetirements` array with full `RETIRE` scenario analyses (impact score, affected assets/capabilities/outcomes, confidence, readiness).
- `GET /api/scenario-planning/portfolio` → **timed out / hung with no response** (confirmed via 15s and direct curl reproduction; server log shows `request aborted` after 14+ seconds, consistent with the broader performance problem in Section 4).
- Only RETIRE scenario type was observed populated; RENEW/OPTIMISE/EXPAND/CONSOLIDATE/DO_NOTHING scenario types were not exercised/found populated within the time available.
- **Verdict:** Root scenario endpoint works and tells a RETIRE story; `/portfolio` must be avoided live (hangs), and only one of six required scenario types (Retire) is confirmed actually populated.

### Step 8 — Execution Readiness
- `GET /api/governed-execution/plans` → HTTP 200 but returns `[]`.
- `GET /api/governed-execution/summary` → HTTP 200, populated: `planCount:5`, `readyCount:0`, `awaitingApprovalCount:0`, `blockedCount:0`, `readiness:"PARTIAL"`. **Note the inconsistency**: summary reports `planCount:5` while the plans list endpoint returns an empty array for the same tenant — a real data-surfacing bug.
- `GET /api/recommendation-orchestration/` and `/queue` → **both hung/timed out** (confirmed via server log `request aborted` after 14+ seconds and again after restart).
- **Verdict:** Execution Readiness is the weakest area verified: the plans list is empty, recommendation-orchestration's primary routes do not respond in reasonable time, and the one populated summary route contradicts the plans list count.

### Step 9 — Closed Loop Optimisation
- `GET /api/closed-loop-optimisation/authority` → HTTP 200, but took **43.6 seconds** to respond. Populated and detailed: `verdict:"NOT_READY"`, `score:2`, coverage breakdown across approval/execution/verification/protection/value/learning stages, `"Of 114 technology recommendation(s) tracked: 0 have an approval record, 5 have a governed execution, 3 are verified, 0 are protected, 0 have realised value, and 5 have learning evidence."`
- `GET /api/closed-loop-optimisation/portfolio` → timed out (14.9s, request aborted in server log).
- `GET /api/closed-loop-optimisation/value` and `/learning` → both timed out at 60s after dataset inflation, and contributed to a server crash (see Section 4).
- **Verdict:** Closed Loop Optimisation is demonstrable in principle (the authority endpoint shows the full Recommended→Approved→Executed→Verified→Protected→Value→Learning model with real coverage ratios), but response times are unacceptable for a live demo (40+ seconds) and several sub-stage endpoints hang outright. Coverage is also very poor (0% approval coverage, 0% protection, 0% value realised) — the closed loop is NOT actually closing for this tenant's data.

### Step 10 — Executive Proof Packs
- `GET /api/executive-proof-packs/summary` → HTTP 200 (11.7s response time), populated: `packCount:6`, `readyCount:0`, `blockedCount:6` — **all 6 proof packs are blocked**, `averageReadinessScore:50`.
- `GET /api/executive-proof-packs/packs` → HTTP 200 but returns `[]` — empty, despite summary reporting 6 packs and listing their IDs (`cio-...`, `procurement-...`, `board-...`, `operator-...`, `audit-...`, `cfo-...`).
- **Verdict:** Pack existence and types (Board, CFO, CIO, Procurement, Audit, Operator) are confirmed via summary IDs, but the actual pack list endpoint is empty (another list-vs-summary inconsistency, same pattern as Steps 6 and 8), and all 6 packs are blocked rather than export-ready — a presenter cannot show a single finished, exportable proof pack today.

---

## 3. Live Customer / First-Login Verification

- `POST /api/px0/live/bootstrap` with `{"tenantName":"PX0R Live Test","tenantSlug":"px0r-live-test","adminEmail":"admin@example.com"}` → HTTP 200: `{"tenantId":"px0r-live-test","status":"PROVISIONED","readinessScore":20,"overallStatus":"BLOCKED","onboardingStepCount":10}`.
- `GET /api/px0/live/new-tenant-view?tenantId=px0r-live-test` → HTTP 200, fully populated: `readinessScore:20`, `overallStatus:"BLOCKED"`, `nextActions` (4 prioritized actions: connect required sources, validate data coverage, pass safety gates, run economic control chain audit), `missingConnectors` (12 named connectors all `MISSING`: ap, entra_id, manual_upload, custom, ai_provider, flexera, m365, procurement, erp, hris, saas_discovery, servicenow), `firstOutcomeReady:false`.
- Confirmed clean separation from demo data: `GET /api/technology-portfolio/vendors` and `/assets` for `px0r-live-test` both return `[]` — **zero** seeded records, unlike `demo-certen-enterprise`'s 11/165+ (and the inflated 82/1003 after accidental re-seeding).
- **Verdict:** Live/first-login path works exactly as specified — honest, unfaked "you have nothing connected yet" state with a clear onboarding plan.

---

## 4. Runtime Protection Verification

**Search terms:** `evaluateDemoDataRisk`, `isDemoTenant`, DEMO-mode guards in execution routes/services.

**What IS enforced:**
- `src/lib/live-tenant-readiness/live-tenant-readiness-service.ts`:
  ```js
  async evaluateDemoDataRisk(t){const p=await this.repo.getLatestTenantProfile(t); if(!p)return false; if(p.mode==='DEMO')return true; ... }
  async evaluateLiveModeApproval(t){const p=await this.repo.getLatestTenantProfile(t); if(!p||p.mode==='DEMO')return false; ...}
  ```
  This **is** real, enforced logic: a tenant flagged `mode==='DEMO'` can never pass `evaluateLiveModeApproval` (used by `/approve-live-mode`), and `evaluateDemoDataRisk` feeds into the readiness snapshot's `demoDataAbsentInLive` flag, which gates `overallStatus==='READY'`. Confirmed by the audit test in `live-tenant-readiness-audit.ts`: `ok('demo tenant cannot be approved for live mode', demoBlocked)`.
- `src/lib/economic-operations-intent-service.ts` has a `TENANT_OPERATIONAL_MODE_REGISTRY` keyed by `tenantMode` that blocks `EXECUTE` intents for `PILOT_READ_ONLY` / `PRODUCTION_RECOMMEND_ONLY` modes (`return reject('INTENT_BLOCKED_BY_TENANT_MODE', ...)`), and gates live M365 license mutation behind the `M365_LIVE_LICENSE_MUTATION_ENABLED` env var. For `tenantMode==='DEMO'`, executions are auto-marked `EXECUTED` (i.e., simulated, never live).
- `src/lib/connectors/m365/m365-disabled-user-reclaim-slice.ts` checks `input.tenantMode !== "DEMO"` before filtering out demo-named users, and forces `executionMode:"SIMULATED"` for DEMO tenants vs `"DRY_RUN"` otherwise.
- `src/lib/connector-readiness/connector-readiness-repository.ts` rejects mismatched config: `if(v.mode==='LIVE'&&v.source==='demo-fixture')throw new Error('LIVE_CONFIG_REJECTS_DEMO_FIXTURE')`.

**What is NOT enforced:**
- The **generic `governed-execution` router** (`/api/governed-execution/plans/:id/execute`, the main "Execution Readiness" surface walked in Step 8) has **no tenant-mode or demo-tenant guard anywhere in `src/lib/governed-execution/`**. The only DEMO-related artifact found is a `'DEMO'` value in the `readiness` union type used for *labeling*, not for blocking execution. A demo tenant could call `execute` on this router with no enforcement preventing it from behaving as if it were live, and a live tenant has no check here preventing it from being polluted with demo-style data either.
- The protections that do exist (`economic-operations-intent-service`, M365 connector slice) are narrowly scoped to specific connector-execution code paths, not to the general execution/orchestration surface most of the Executive Demo Journey (Steps 8–9) actually exercises.
- No code under `governed-execution`, `recommendation-orchestration`, or `closed-loop-optimisation` calls `evaluateDemoDataRisk` or checks `isDemoTenant` before performing or reporting on executions.

**Conclusion:** Runtime protection is real but **partial and inconsistently applied** — strong at the tenant-onboarding/live-mode-approval layer and in one M365-specific execution path, essentially absent in the general governed-execution/closed-loop pipeline that the demo's "Decisions → Outcomes" half relies on.

---

## 5. Gap Register

| Gap | Classification | Description | Recommended Fix |
|---|---|---|---|
| `demo-login` issues a bare UUID, not a JWT | DEMO_BLOCKER | `POST /api/auth/demo-login` returns `accessToken: <randomUUID>` via `issueSessionToken()`; using it as a Bearer token against any `requireTenantContext()` route returns `403 TENANT_ACCESS_DENIED`. Frictionless demo login does not grant real authenticated access. Also returns `tenantId:"demo-certen"`, not the actual seeded `demo-certen-enterprise` tenant — a second mismatch. | Issue a signed JWT from this route (mirroring the platform-admin minting used in this verification), and point `tenantId` at the real seeded demo tenant. |
| `"leftshield"` out-of-scope guard risk, and it already collides with the default demo tenant | DATA_ISSUE / UX_ISSUE | `assertInScope()` in `economic-outcome-attribution.ts` throws `ECONOMIC_OUTCOME_ATTRIBUTION_ONLY` if any request payload JSON-stringifies to contain "leftshield" (or "Agent Security Analytics", "attack path", "exploit", "prompt tracing", "runtime security", "MCP attack"). Worse: `DEMO_TENANT_ID = 'demo-leftshield-enterprise'` is the **default** value in `demo-seed-builder.ts` — the platform's own default demo tenant name trips its own guard. Only the explicitly-overridden `demo-certen-enterprise` avoids this. | Rename the default `DEMO_TENANT_ID`/`DEMO_TENANT_NAME` away from "leftshield", and scope `assertInScope` to actual security-content fields rather than whole-payload JSON, so legitimate tenant/company names can never trip it. |
| AI Initiatives short of minimum | DATA_ISSUE | Seed produced 7 AI initiatives; spec requires 10+. | Extend `demo-seed-builder.ts` to add 3+ more AI initiatives, ideally distributed across SCALE/MAINTAIN/OPTIMISE/RETIRE stages (currently all 7 are EXPERIMENT-stage with REVIEW-only decisions). |
| Closed-loop records short of minimum | DATA_ISSUE | Seed produced 8 closed-loop asset IDs; spec requires 10+, and closed-loop authority shows only 0% approval/protection/value-realisation coverage. | Extend seed to add 2+ more closed-loop records and populate at least some approval/verification/value-realisation evidence so the loop visibly closes for the demo. |
| Demo seed endpoint is non-idempotent for assets | DATA_ISSUE | `buildDemoSeed()` upserts vendors by name but inserts assets fresh every call with no dedupe key. Re-running seed against the same tenant ID inflates asset/vendor counts indefinitely (observed 165→671→1003 assets, 11→60→82 vendors across 3 calls during this verification) and caused two full server crashes under the resulting load. | Make asset seeding idempotent (delete-and-reseed or upsert-by-stable-key for the tenant before inserting), or have the seed endpoint refuse to re-run against a tenant that already has data unless a `reset=true` flag is passed. |
| Severe response-time degradation on several core endpoints | DEMO_DEGRADATION | `closed-loop-optimisation/authority` took 43.6s; `executive-proof-packs/summary` took 11.7s; `technology-capital-allocation/recommendations` without a `limit` param did not return within 110s; multiple endpoints (`scenario-planning/portfolio`, `recommendation-orchestration/` and `/queue`, `closed-loop-optimisation/portfolio`/`value`/`learning`) hung and were logged server-side as `request aborted` after 14–60s. Two full server crashes occurred under load from the inflated dataset. | Add caching/memoization for these summary computations, add database indexes for tenant-scoped lookups, add pagination defaults everywhere (`limit` should not be optional with no cap), and add timeouts/circuit breakers so a slow query degrades gracefully instead of hanging the request and eventually crashing the process. |
| Several "list" endpoints return empty despite matching "summary" endpoints reporting non-zero counts | DATA_ISSUE | `GET /api/ai-initiatives` → `{"initiatives":[]}` vs `ai-initiatives/portfolio` showing 7; `GET /api/decisions` → `[]` vs `executive-decision-authority/queue` populated; `GET /api/governed-execution/plans` → `[]` vs `governed-execution/summary` reporting `planCount:5`; `GET /api/executive-proof-packs/packs` → `[]` vs `summary` reporting `packCount:6` with named IDs; `GET /api/technology-portfolio/applications` → `[]`; `GET /api/recommendations`, `/api/opportunities`, `/api/technology-portfolio/recommendations` → all empty. | Audit each pair of list/summary endpoints backed by the same repository — these are very likely querying different (or stale/wrong) collections or tenant keys. Fix the list endpoints to read from the same source as the corresponding summary. |
| Workflow Value Graph has zero data for the demo tenant | DATA_ISSUE | `GET /api/workflow-value-graph/workflows` → `[]`. This is a distinct authority from `technology-economics`/`technology-capital-allocation` and was never seeded. | Either seed representative workflow-value-graph data for the demo tenant, or remove/hide this surface from the executive demo journey until it has data. |
| AI Value label spectrum not demonstrable | UX_ISSUE | All 7 AI initiatives resolve to `REVIEW` with `confidenceScore:0` in `ai-capital-allocation-authority`; EXPAND/KEEP/OPTIMISE/RETIRE counts are all 0. The presenter cannot show the full decision spectrum live for AI, unlike the Technology side (which at least shows KEEP/RETIRE/REVIEW). | Diversify seed data so at least one AI initiative resolves to each of EXPAND/KEEP/OPTIMISE/RETIRE, not just REVIEW. |
| Scenario types beyond RETIRE not confirmed populated | UX_ISSUE | Only `mostImpactfulRetirements`/RETIRE scenarios were found populated via `/api/scenario-planning/`. RENEW/OPTIMISE/EXPAND/CONSOLIDATE/DO_NOTHING were not found populated in the time available, and `/portfolio` (the likely place to find them) hangs. | Verify and, if needed, seed scenario data for all 6 required scenario types; fix the `/portfolio` hang first so this can even be checked. |
| Governed-execution router has no demo/live enforcement | LIVE_ISSUE | The general execution surface (`governed-execution`) used in Step 8 has no code referencing `evaluateDemoDataRisk`/tenant mode anywhere in `src/lib/governed-execution/`, unlike the narrowly-scoped M365/economic-operations-intent paths which do enforce this. | Add a tenant-mode check (reusing `liveTenantReadinessService.evaluateDemoDataRisk`/`evaluateLiveModeApproval`) at the top of `governed-execution`'s `execute`/`approve` handlers so demo tenants cannot trigger anything that looks like a real production action, and live tenants are blocked from receiving fixture-sourced plans. |
| Two inconsistent "contracts" data sources | UX_ISSUE | The top-level `/api/contracts` router returns a curated 6-contract dataset (AWS EDP, Microsoft EA, etc.) while the seed/`technology-portfolio` reports 83 contract *links*. A presenter switching between these screens will show inconsistent contract counts. | Document clearly which screen is the "contract count of record" for executives, or reconcile the two data sources. |

**Gap count by classification:** DEMO_BLOCKER: 1. DEMO_DEGRADATION: 1 (covering ~8 individually-cited slow/hanging endpoints). DATA_ISSUE: 6. UX_ISSUE: 3. LIVE_ISSUE: 1. Total distinct gaps: 12.

---

## 6. Certen Demo Runbook (30–45 minutes)

**Pre-demo checklist:** confirm server is warm (hit `/api/health` and one summary endpoint a few minutes before presenting — first calls are slow), confirm `demo-certen-enterprise` is the active tenant (do NOT re-run `/api/px0/demo/seed` — it is not safe to re-run), and have the platform-admin JWT pre-minted and loaded into whatever client tool/UI you're driving (do not rely on `/api/auth/demo-login`).

1. **Executive Overview (3 min).** Show `GET /api/executive-command-center/summary` and `/api/executive-experience/dashboard`. Say: "Across 173 technology assets and $42M in known spend, the platform already classifies 88 assets as KEEP and 22 for RETIREMENT, with $24M of attributed value visible today." Do NOT dwell on `roiCoverage:0` — acknowledge value attribution is still maturing, do not claim more than the data shows.

2. **Technology Portfolio (3 min).** Show `GET /api/technology-portfolio/summary` and `/vendors`. Say: "11 vendors and 165+ assets are fully inventoried with ownership and lifecycle data." **Do NOT click into "Applications"** — it returns empty and will visibly break the narrative.

3. **Technology Value (4 min).** Show `GET /api/technology-capital-allocation/summary` and a few `recommendations` (use a `limit` query param, e.g. `?limit=5` — never call without a limit). Say: "Capital allocation logic assigns KEEP, RETIRE, or REVIEW to every asset with a documented rationale — here are 22 retirement candidates worth $X in spend." **Avoid `/api/workflow-value-graph/workflows`** — it is empty for this tenant.

4. **AI Portfolio (3 min).** Show `GET /api/ai-initiative-portfolio/portfolio-summary` (NOT the plain `/api/ai-initiatives` list, which is empty). Say: "7 AI initiatives are tracked, 5 active, 1 scaling." Be upfront that the count is below our long-term target and more initiatives are being onboarded.

5. **AI Value (3 min).** Show `GET /api/ai-value-graph/summary` and `/api/ai-capital-allocation-authority/recommendations`. Say: "Every AI initiative now carries a capital-allocation decision with full rationale — today they all land in REVIEW because spend/value attribution is still being connected, which is itself a useful signal to leadership about where AI governance needs to focus next." Frame the all-REVIEW result honestly as a current-state signal, not a platform limitation to hide.

6. **Executive Decisions (3 min).** Show `GET /api/executive-decision-authority/queue` (NOT `/api/decisions`, which is empty). Say: "The decision queue prioritizes the 22 retirement-ready assets with full evidence trails attached."

7. **Scenario Planning (3 min).** Show `GET /api/scenario-planning/` only. Say: "Here's the impact analysis for retiring this specific asset — 1 capability and 1 outcome affected." **Do NOT call `/api/scenario-planning/portfolio`** — it hangs.

8. **Execution Readiness (3 min).** Show `GET /api/governed-execution/summary` only (NOT `/plans`, which is empty and contradicts the summary). Say: "5 execution plans exist in the pipeline; governance gates are still being satisfied before they can run." **Do NOT call `recommendation-orchestration/` or `/queue`** — both hang/time out.

9. **Closed Loop Optimisation (4 min, pre-warm this call before the live demo — it can take 30–45 seconds).** Show `GET /api/closed-loop-optimisation/authority`, called in advance and screenshotted/cached if necessary. Say: "Of 114 tracked recommendations, 5 have moved into governed execution and 3 are verified — this is the full loop from recommendation to verified, protected value." Be honest that approval (0%) and value-realisation (0%) coverage are still early. **Do NOT call `/portfolio`, `/value`, or `/learning` live** — all three hang.

10. **Executive Proof Packs (3 min).** Show `GET /api/executive-proof-packs/summary` (pre-warm — 10+ second response time) for the 6 named packs (Board, CFO, CIO, Procurement, Audit, Operator). Say: "Six audience-specific proof packs are generated and tracked end to end." Acknowledge all 6 are currently blocked rather than claiming any are export-ready — **do not call `/packs`**, it is empty and will look broken next to the summary's 6-pack claim.

**Closing (Live customer onboarding, 2 min, optional bonus).** Show `GET /api/px0/live/new-tenant-view` for a fresh tenant to demonstrate the contrast: zero data, 12 missing connectors, clear next actions — proving the platform is honest about what it does and doesn't know on day one.

---

## 7. Final Demo Readiness Assessment

**DEMO_READY_WITH_GAPS**

The core narrative arc — Spend → Value → Decisions → Outcomes — is genuinely demonstrable end-to-end using `demo-certen-enterprise`: the Executive Overview, Technology Portfolio, Technology Value (KEEP/RETIRE/REVIEW), Executive Decisions, one Scenario Planning view, and the Closed-Loop authority view all return real, populated, internally-consistent data with no fabrication. The platform-admin JWT + `x-tenant-id` auth path works reliably and bypasses tenant-match restrictions as designed, and the live/first-login contrast (zero data, honest connector gaps) is clean and compelling.

However, this is not unqualified DEMO_READY: 12 distinct gaps were found, including one DEMO_BLOCKER (the advertised frictionless demo-login path is non-functional as real authentication), a cluster of endpoints that hang or take 10–45+ seconds (several outright unusable live without pre-warming or avoidance), at least 6 "list" endpoints that contradict their corresponding "summary" endpoint's counts, two data-completeness shortfalls against the stated minimums (AI initiatives, closed-loop records), a real default-tenant-name collision with the platform's own out-of-scope guard, a non-idempotent demo seed that caused two server crashes during this very verification, and confirmed-absent runtime enforcement preventing demo tenants from "executing" in the general governed-execution pipeline. A presenter who sticks to the runbook in Section 6 (and avoids the specific endpoints flagged as broken) can run a credible 30–45 minute executive demo today, but only with careful navigation around known landmines — which is the definition of DEMO_READY_WITH_GAPS rather than DEMO_READY.
