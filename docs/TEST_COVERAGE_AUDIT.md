# Test Coverage Audit — Sprint 16

## Executive summary

This audit reviewed the current clean baseline after the baseline cleanup and Headless Certen foundation. It did not add product features, authorities, connectors, APIs, or UI changes.

Overall posture:

- **Backend authority coverage is broad but uneven.** Evidence Registry, Asset Registry, Outcome Protection, Trust Readiness, Executive Proof Packs, and Authority Query have direct tests. Principal Authority is only partially covered through principal/evidence and asset-owner flows. Decision lineage and the AI moat authorities have useful headless/query coverage but lack route-to-persistence and lifecycle integration depth.
- **Route coverage is high by volume but inconsistent by criticality.** Many `/api/*` files have same-domain tests, but several customer-visible CRUD surfaces are uncovered or only covered indirectly: `principals`, `assets`, `asset-owners`, `approvals`, `approval-workflows`, `execution-requests`, `economic-outcomes`, `opportunities`, `recommendations`, `priorities`, `schedules`, `tenant-pricing`, and `vendor-changes`.
- **Control-plane coverage is snapshot/smoke-heavy.** Core executive, governance, M365 execution, evidence, trust, and protection pages have tests. Many operational/platform pages are untested or only protected by broad rendering tests.
- **Critical-path coverage is strongest around M365 governed execution, evidence, protection, trust readiness, and proof packs.** The largest pre-polish risks are end-to-end approval→execution→verification→outcome→protection, principal/asset owner lifecycles through routes, decision lineage through durable stores, and complete lifecycle coverage for AI economics/portfolio/capital allocation authorities.
- **No coverage runner is currently configured.** Existing tooling is custom Node/TypeScript test runners, so this audit reports static inventory metrics instead of line/branch coverage.

## Coverage metrics

| Area | Count | Notes |
| --- | ---: | --- |
| API source files | 3,752 | `artifacts/api-server/src/**/*.ts` |
| API test files | 1,586 | `artifacts/api-server/src/tests/*.test.ts` |
| API route files | 86 | `artifacts/api-server/src/routes/*.ts` |
| Control-plane source files | 403 | `artifacts/control-plane/src/**/*.{ts,tsx}` |
| Control-plane page files | 88 | `artifacts/control-plane/src/pages/*.tsx` |
| Control-plane test files | 68 | `artifacts/control-plane/src/lib/*.test.{ts,tsx}` |
| Route files with direct or strong same-domain tests | ~61 / 86 | Static filename/domain matching plus targeted review |
| Authority modules with direct tests | 9 / 14 | Some AI/value authorities are represented indirectly through query/headless tests |
| UI pages with direct page/component tests | ~35 / 88 | Several additional pages are covered only by broad render/density suites |

## Authority coverage inventory

| Authority | Classification | Evidence observed | Gap / note |
| --- | --- | --- | --- |
| Principal Authority | PARTIAL | `principal-evidence-registry.test.ts`, asset-owner linking in `asset-registry-service.test.ts` | Needs direct principal route + lifecycle tests for create/resolve/merge/tenant isolation. |
| Evidence Registry | COVERED | `evidence-registry-end-to-end.test.ts`, `evidence-registry-persistence.test.ts`, `evidence-registry-audit.test.ts`, route-adjacent evidence pack tests | Strong unit, persistence, audit, and integration coverage. |
| Asset Registry | COVERED | `asset-registry-service.test.ts` covers creation, normalization, mappings, owner links, M365 backfill, evidence linking | Route files `assets.ts` and `asset-owners.ts` still need explicit API tests. |
| Decision Authority | PARTIAL | `authority-query.test.ts` decision intent/answer, approval/workflow tests, governance event tests | Needs durable decision lineage lifecycle tests across decision creation, evidence binding, supersession, and query. |
| Value Realisation Authority | PARTIAL | executive value/economic outcome tests, outcome ledger/simulation tests | Naming and lifecycle tests are fragmented; needs explicit realization lifecycle and route coverage. |
| Workflow Value Graph | PARTIAL | `economic-graph-builder.test.ts`, workflow SLA/backlog tests, Authority Query workflow answer | Needs explicit workflow value graph lifecycle tests and route-level query coverage. |
| AI Value Attribution | PARTIAL | Authority Query value-attribution intent/answer, `ai-runtime-attribution-engine.test.ts` | Needs lifecycle tests from AI signal ingestion to attributed value and evidence. |
| AI Economics Authority | PARTIAL | Authority Query economics answer, AI spend/classification/cost playbook tests, UI economic control tests | Needs full lifecycle and route/API coverage for economics records. |
| AI Initiative Portfolio | PARTIAL | portfolio/governance tests and capital-allocation query seed coverage | Needs explicit portfolio authority lifecycle tests. |
| AI Capital Allocation | PARTIAL | Authority Query capital allocation intent/answer and guardrail tests | Needs API + persistence + ranking regression coverage beyond seeded in-memory query records. |
| Authority Query Layer | COVERED | `authority-query.test.ts` covers intent classification, headless adapter, API ask endpoint, read-only guardrail | Strong headless answer coverage; add more negative/tenant isolation route cases. |
| Outcome Protection | COVERED | `outcome-protection.test.ts`, UI protection test | Strong protection, drift, remediation, rollup, ledger, tenant isolation, and no-autonomous-execution coverage. |
| Trust Authority | COVERED | `trust-readiness-authority.test.ts`, trust route/UI tests | Strong readiness verdict and guardrail coverage. |
| Executive Proof Packs | COVERED | `executive-proof-packs.test.ts`, persistence, audit, end-to-end tests, UI test | Strong service, export safety, readiness, persistence, and UI coverage. |

## Route coverage table

Classification key: **COVERED** = direct route/API or strong same-domain service tests; **PARTIAL** = indirect or service-only coverage; **UNCOVERED** = no clear route/domain test; **DB_ONLY** = meaningful coverage depends on DB integration; **OBSOLETE** = aggregator/internal/legacy route not expected to be customer-visible.

| Route file | Classification | Notes |
| --- | --- | --- |
| `actions.ts` | PARTIAL | Action semantics and trust-resolution tests exist, but route behavior is indirect. |
| `ai.ts` | PARTIAL | Many AI engine tests; route-specific contract depth unclear. |
| `approval-authority.ts` | COVERED | Approval authority consolidation/authority tests. |
| `approval-workflows.ts` | UNCOVERED | No direct matching route test found. |
| `approvals.ts` | UNCOVERED | Approval UI/service tests exist, route is not directly covered. |
| `asset-owners.ts` | UNCOVERED | Owner lifecycle covered in service, not route. |
| `assets.ts` | UNCOVERED | Asset registry service covered, route not direct. |
| `audit-packs.ts` | UNCOVERED | No direct matching test found. |
| `auth.ts` | PARTIAL | Authorization service and security route guard tests; auth route contract unclear. |
| `authority-query.ts` | COVERED | API ask endpoint covered. |
| `benchmarks.ts` | PARTIAL | Benchmark engine/UI tests, route directness unclear. |
| `campaigns.ts` | COVERED | Recommendation campaign tests. |
| `connector-adapters.ts` | COVERED | Adapter audit/tests. |
| `connector-contract-testing.ts` | COVERED | Contract testing route/audit tests. |
| `connector-readiness.ts` | COVERED | Readiness persistence/gating/tests. |
| `connector-sdk.ts` | UNCOVERED | No direct matching test found. |
| `connectors.ts` | PARTIAL | Production connector tests cover related behavior. |
| `contracts.ts` | PARTIAL | Shared contract tests, not route-focused. |
| `dashboard.ts` | UNCOVERED | No direct route test found. |
| `demo.ts` | COVERED | Demo/live separation, golden/customer demo tests. |
| `discovery.ts` | COVERED | Discovery lifecycle and adapters. |
| `drift.ts` | COVERED | Drift detector/governance tests. |
| `economic-control-chain.ts` | COVERED | Economic control chain test. |
| `economic-operations.ts` | COVERED | Intent, registry, telemetry, scheduler tests. |
| `economic-outcomes.ts` | UNCOVERED | Outcome economics tested elsewhere, route not direct. |
| `enterprise.ts` | PARTIAL | Enterprise graph/realism tests. |
| `erp.ts` | PARTIAL | ERP graph/discovery tests. |
| `events.ts` | COVERED | Platform/governance event tests. |
| `evidence-packs.ts` | COVERED | Evidence pack service/route tests. |
| `evidence-registry.ts` | COVERED | End-to-end, persistence, audit tests. |
| `evidence.ts` | COVERED | Evidence registry/citation/governance tests. |
| `execution-dry-run.ts` | COVERED | Dry-run test. |
| `execution-orchestration.ts` | COVERED | Scheduler, controls, processor tests. |
| `execution-requests.ts` | UNCOVERED | Execution request flows tested in UI/live suites, route directness missing. |
| `execution-results-outcome.ts` | UNCOVERED | No direct matching route test found. |
| `execution-runtime.ts` | COVERED | Runtime/readiness/boundary tests. |
| `execution.ts` | COVERED | Governed execution E2E, preconditions, request tests. |
| `executive-proof-packs.ts` | COVERED | Service, persistence, audit, E2E. |
| `executive-value.ts` | COVERED | Service/aggregator/route tests. |
| `financial-truth-authority.ts` | COVERED | Authority persistence/audit tests. |
| `flexera.ts` | COVERED | Production/discovery/audit tests. |
| `governance-exceptions.ts` | COVERED | Direct test. |
| `governance.ts` | COVERED | Governance boundary/policy/evidence tests. |
| `governed-execution.ts` | COVERED | Dispatcher/simulation/E2E tests. |
| `graph.ts` | COVERED | Graph builder/reasoning/domain tests. |
| `health.ts` | PARTIAL | M365 and connector health tests. |
| `index.ts` | OBSOLETE | Route aggregator; not independently customer-visible. |
| `jobs.ts` | PARTIAL | Scheduler coverage; route directness unclear. |
| `live-tenant-readiness.ts` | COVERED | Audit/persistence/readiness tests. |
| `onboarding.ts` | COVERED | M365 onboarding route/service tests. |
| `operationalization.ts` | COVERED | Operationalization suite. |
| `opportunities.ts` | UNCOVERED | UI page tests exist; route not direct. |
| `opportunity-factory.ts` | COVERED | Factory route/service tests. |
| `outcome-finance-reconciliation.ts` | COVERED | Direct/audit/persistence tests. |
| `outcome-protection.ts` | COVERED | Direct authority tests. |
| `outcomes.ts` | PARTIAL | Outcome simulation/ledger tests; route directness unclear. |
| `ownership-intelligence.ts` | COVERED | Route/playbook/tests. |
| `packs.ts` | PARTIAL | Proof pack tests cover domain; route may be alias/legacy. |
| `pilot.ts` | PARTIAL | Pilot and M365 dry-run tests. |
| `platform-events.ts` | COVERED | Platform event service tests. |
| `playbooks.ts` | COVERED | Adobe/AI/M365 playbook tests. |
| `principals.ts` | UNCOVERED | Principal lifecycle lacks route tests. |
| `priorities.ts` | UNCOVERED | No direct matching route test found. |
| `procurement-ap.ts` | COVERED | Client/evidence/graph tests. |
| `production-connectors.ts` | COVERED | Production connector/audit tests. |
| `recommendations.ts` | UNCOVERED | Recommendation engines covered, route not direct. |
| `reconciliation.ts` | COVERED | Reconciliation taxonomy/runtime/confidence tests. |
| `renewals.ts` | PARTIAL | Renewal scenario/page tests. |
| `runtime-observability.ts` | COVERED | Runtime observability tests. |
| `runtime-recovery.ts` | UNCOVERED | No direct matching test found. |
| `runtime.ts` | COVERED | Runtime simulation/replay/outcome tests. |
| `schedules.ts` | UNCOVERED | No direct matching route test found. |
| `security.ts` | COVERED | Security anomaly/SKU/route guard tests. |
| `servicenow.ts` | COVERED | ServiceNow action/portfolio/SAM tests. |
| `simulations.ts` | UNCOVERED | Simulation engines tested elsewhere, route not direct. |
| `technology-commercial-authority.ts` | COVERED | Authority/persistence/audit tests. |
| `technology-portfolio.ts` | COVERED | Authority/persistence/E2E tests. |
| `telemetry.ts` | PARTIAL | Connector/runtime telemetry tests. |
| `tenant-pricing.ts` | UNCOVERED | No direct matching route test found. |
| `trust-readiness.ts` | COVERED | Trust readiness authority tests. |
| `trust.ts` | COVERED | M365 trust/AI trust/resolution tests. |
| `utilization.ts` | COVERED | Utilization engine/simulation tests. |
| `vendor-changes.ts` | UNCOVERED | No direct matching route test found. |
| `verification.ts` | COVERED | Verification/outcome/rollback tests. |
| `workflow.ts` | COVERED | Approval workflow/SLA/backlog tests. |
| `workspace.ts` | PARTIAL | Workspace entropy/summary tests. |

## UI coverage table

Classification key: **COVERED** = direct page/component test; **PARTIAL** = broad render/density or adjacent route/component coverage only; **UNCOVERED** = no clear page-level test; **NOT_CUSTOMER_VISIBLE** = internal shell/diagnostic/fallback; **LEGACY** = older route/page likely retained for compatibility.

| Page | Classification | Notes |
| --- | --- | --- |
| `AIEconomicCommandDashboard.tsx` | PARTIAL | Economic control UI test exists but filename does not directly target page. |
| `AIGovernanceExposure.tsx` | PARTIAL | AI governance UI tests exist. |
| `ActionCenter.tsx` | COVERED | Direct action-center UI test. |
| `ApprovalCenter.tsx` | COVERED | Direct approval-center UI test. |
| `ApprovalWorkflowsView.tsx` | UNCOVERED | No direct page test found. |
| `AuditLogPage.tsx` | NOT_CUSTOMER_VISIBLE | Internal/audit page; no direct page test. |
| `BenchmarkIntelligenceView.tsx` | COVERED | Direct benchmark intelligence test. |
| `CampaignsView.tsx` | UNCOVERED | No direct page test found. |
| `CommandView.tsx` | COVERED | Command/executive command tests. |
| `ConnectorCapabilityRegistry.tsx` | UNCOVERED | No direct page test found. |
| `ConnectorHub.tsx` | UNCOVERED | No direct page test found. |
| `ContractIntelligenceView.tsx` | COVERED | Contract/renewal intelligence tests. |
| `DataTrustView.tsx` | COVERED | Data trust console test. |
| `DriftMonitorView.tsx` | UNCOVERED | No direct page test found. |
| `EconomicOutcomeDashboard.tsx` | PARTIAL | Economic outcome UI test exists, but page directness unclear. |
| `EvidencePacksView.tsx` | COVERED | Evidence packs UI test. |
| `EvidenceRegistry.tsx` | COVERED | Evidence registry UI test. |
| `ExecutionView.tsx` | COVERED | Execution request/governed execution live tests. |
| `ExecutiveOutcomeDashboard.tsx` | UNCOVERED | No direct page test found. |
| `ExecutivePrioritiesView.tsx` | COVERED | Executive priorities test. |
| `ExecutiveProofPacks.tsx` | COVERED | Executive proof packs UI test. |
| `ExecutiveRiskCommandCenter.tsx` | COVERED | Direct executive risk command center test. |
| `ExecutiveValueDashboard.tsx` | COVERED | Direct executive value dashboard test. |
| `FirstOutcomeJourney.tsx` | UNCOVERED | No direct page test found. |
| `GovernanceGraph.tsx` | COVERED | Governance graph test. |
| `GovernanceView.tsx` | PARTIAL | AI governance/governance graph coverage; page-specific assertions limited. |
| `GovernedExecution.tsx` | COVERED | Governed execution and M365 validation tests. |
| `IntelligenceView.tsx` | COVERED | Vendor/benchmark intelligence tests. |
| `LandingPage.tsx` | LEGACY | Landing/marketing entry; no direct product test. |
| `LiveTenantReadinessView.tsx` | COVERED | Live tenant readiness UI test. |
| `M365OnboardingView.tsx` | COVERED | M365 onboarding UI test. |
| `OpportunitiesView.tsx` | COVERED | Opportunities page test. |
| `OutcomeLedgerView.tsx` | UNCOVERED | No direct page test found. |
| `OutcomeProtectionView.tsx` | COVERED | Outcome protection UI test. |
| `OwnershipIntelligence.tsx` | COVERED | Ownership intelligence test. |
| `PilotWorkspace.tsx` | COVERED | Pilot workspace test. |
| `RenewalContractIntelligence.tsx` | COVERED | Renewal contract intelligence test. |
| `RenewalsView.tsx` | COVERED | Renewals page test. |
| `RuntimeHealthView.tsx` | UNCOVERED | No direct page test found. |
| `SaaSRationalisation.tsx` | COVERED | SaaS rationalisation test. |
| `SchedulingView.tsx` | UNCOVERED | No direct page test found. |
| `SecurityView.tsx` | UNCOVERED | No direct page test found. |
| `SettingsPage.tsx` | NOT_CUSTOMER_VISIBLE | Internal settings; no direct page test. |
| `ShadowITExposure.tsx` | COVERED | Shadow IT exposure test. |
| `SyncJobsPage.tsx` | NOT_CUSTOMER_VISIBLE | Operational/internal page; no direct page test. |
| `TechnologyPortfolio.tsx` | COVERED | Technology portfolio test. |
| `TenantReadiness.tsx` | COVERED | Covered by live tenant readiness UI test. |
| `UtilizationIntelligenceView.tsx` | COVERED | Utilization intelligence test. |
| `VendorIntelligenceView.tsx` | COVERED | Vendor intelligence tests. |
| `WorkspaceSelection.tsx` | PARTIAL | Workspace context tests exist; no direct page test. |
| Lowercase operational/platform pages | PARTIAL/UNCOVERED | Many are protected by broad `existing-pages-rendering`, `phase4a-operational-pages`, and `phase4b-platform-pages`; add direct tests only for customer-visible critical pages before polish. |
| `not-found.tsx` | NOT_CUSTOMER_VISIBLE | Fallback route. |

## Critical path coverage table

| Critical path | Classification | Rationale |
| --- | --- | --- |
| 1. First M365 governed execution path | STRONG | M365 playbooks, mutation guard, governed execution E2E, runtime, UI live request/execute/dry-run tests exist. |
| 2. Approval → execution → verification → outcome → protection | PARTIAL | Each stage has tests, but a single full-chain integration from approval through protected outcome is not obvious. |
| 3. Principal + evidence lifecycle | ADEQUATE | Evidence is strong; principal is only partially direct. Needs route lifecycle and merge/isolation tests. |
| 4. Asset + owner lifecycle | ADEQUATE | Asset registry service lifecycle is strong; API route coverage is missing. |
| 5. Decision lineage lifecycle | PARTIAL | Query and governance events cover decision answers, but durable decision lineage lifecycle is fragmented. |
| 6. Value Realisation lifecycle | PARTIAL | Outcome/value tests exist, but explicit value-realisation authority lifecycle is fragmented. |
| 7. Workflow Value Graph lifecycle | PARTIAL | Graph/workflow query tests exist; explicit lifecycle and route coverage missing. |
| 8. AI Value Attribution lifecycle | PARTIAL | Attribution engine/query tests exist; lifecycle from source evidence to value record not complete. |
| 9. AI Economics lifecycle | PARTIAL | Economics answer/cost/playbook tests exist; full API+persistence lifecycle missing. |
| 10. AI Initiative Portfolio lifecycle | WEAK | Related portfolio tests exist, but explicit AI initiative portfolio authority lifecycle is not evident. |
| 11. AI Capital Allocation lifecycle | WEAK | Seeded Authority Query ranking exists; durable allocation lifecycle/API tests are missing. |
| 12. Authority Query headless answer path | STRONG | Intent, answers, sources, API ask endpoint, headless adapter, and read-only guardrail are directly tested. |
| 13. Executive Proof Pack generation | STRONG | Generation, all pack types, export safety, evidence binding, persistence, audit, E2E, and UI covered. |
| 14. Demo/live DataState safety | ADEQUATE | Demo-pilot separation, runtime realism, live tenant readiness, and DataState UI tests exist; add cross-page assertions before UI polish. |

## Gap ranking

### P0 — could mask broken execution, governance, value, protection, evidence, or headless answer behaviour

1. Add a single backend integration covering approval → execution request → runtime execution/verification → outcome ledger → outcome protection.
2. Add direct route tests for `principals.ts`, `assets.ts`, and `asset-owners.ts` including tenant isolation and evidence/owner links.
3. Add direct route or service-route contract tests for `execution-requests.ts`, `execution-results-outcome.ts`, `approval-workflows.ts`, and `approvals.ts`.
4. Add durable decision lineage lifecycle tests with evidence sources and Authority Query retrieval.
5. Add explicit lifecycle tests for Value Realisation and Workflow Value Graph authority records.

### P1 — could mask broken executive/proof/portfolio behaviour

1. Add AI Initiative Portfolio and AI Capital Allocation lifecycle tests beyond seeded query records.
2. Add AI Economics API/persistence lifecycle tests including value-to-cost verdicts and tenant isolation.
3. Add direct tests for `economic-outcomes.ts`, `recommendations.ts`, `opportunities.ts`, and `priorities.ts` routes.
4. Add direct UI tests for `ExecutiveOutcomeDashboard.tsx`, `EconomicOutcomeDashboard.tsx`, `OutcomeLedgerView.tsx`, and `FirstOutcomeJourney.tsx`.

### P2 — could mask UI-only or non-critical behaviour

1. Add direct page smoke/assertion tests for connector hub/registry/operations and platform observability pages that are customer-visible.
2. Add DataState/demo/live banner assertions to high-traffic pages not already covered by DataState tests.
3. Add direct UI tests for scheduling, runtime health, security, drift monitor, campaigns, and approval workflow pages if they remain in the active IA.

### P3 — nice-to-have coverage

1. Add route tests for diagnostics/internal pages only if they remain supported: `audit-packs.ts`, `dashboard.ts`, `schedules.ts`, `tenant-pricing.ts`, `vendor-changes.ts`.
2. Convert broad existing-page rendering tests into smaller intent-based tests over time.
3. Consider line/branch coverage only after the custom runners can emit coverage with minimal harness risk.

## Recommended cleanup plan

### Coverage Sprint A — high-risk backend critical paths

- Build the full approval → execution → verification → outcome → protection integration test.
- Add API route lifecycle tests for principals, assets, asset owners, approvals, approval workflows, execution requests, and execution result outcomes.
- Add direct tenant-isolation and read-only/no-autonomous-execution assertions on these paths.

### Coverage Sprint B — headless + proof-pack + AI moat authorities

- Keep proof-pack coverage mostly as-is; add only missing route negative cases if needed.
- Add durable lifecycle tests for Decision Authority, Value Realisation, Workflow Value Graph, AI Value Attribution, AI Economics, AI Initiative Portfolio, and AI Capital Allocation.
- Extend Authority Query tests to pull from durable records for each authority rather than only seeded in-memory examples.

### Coverage Sprint C — control-plane UI and DataState safety

- Add direct tests for executive outcome, economic outcome, outcome ledger, first outcome journey, approval workflows, runtime health, security, drift, connector hub/registry, and active platform observability pages.
- Add demo/live DataState assertions to the high-traffic pages that currently rely on broad rendering tests.
- Keep screenshots out of scope unless UI behavior changes; no UI changes were made in this audit.

### Coverage Sprint D — legacy/low-value cleanup

- Decide whether legacy/lowercase routes and pages are still active customer surfaces.
- Mark retired pages/routes as legacy in documentation and avoid spending coverage effort on them.
- Add targeted tests for internal diagnostics only when they gate production operations.


## Sprint 17 update — Coverage Sprint A P0 backend critical paths

Sprint 17 added `p0-backend-critical-paths.test.ts` to harden the P0 backend paths identified in this audit without adding product features, authorities, connectors, UI, dashboards, or new environment requirements. The new coverage uses non-DB in-memory test harnesses for lifecycle assertions and the existing Authority Query service/router for the headless answer path.

### Tests added

| Test | P0 path improved | Key assertions |
| --- | --- | --- |
| `P0 M365 governed execution lifecycle records approval, execution request, runtime, M365 evidence, result, outcome update, tenant scope, dry-run safety, failure, and rollback` | Workstream 1 | Covers recommendation-to-approval-to-execution request-to-runtime-to-evidence-to-result-to-outcome-ledger; asserts no execution before approval, dry-run does not create live runs, tenant scoping, failure evidence/errors, and rollback representation. |
| `P0 approval to verification to outcome protection lifecycle records protected state, drift, evidence links, isolation, and failed-verification guard` | Workstream 2 | Covers verification-linked outcome protection, evidence links, protected state, drift check failure for material unknown state, tenant isolation, and failed/unlinked verification guard. |
| `P0 principal and evidence lifecycle resolves requester approver executor, records authority events, preserves raw identities, and links evidence` | Workstream 3 | Covers requester/approver/executor resolution, missing-principal tolerance, principal action events, evidence creation, evidence links to approval/execution/outcome, and raw identity preservation. |
| `P0 decision lineage links governed execution decision to asset, evidence, principals, outcome, protection, and reconstructs graph` | Workstream 4 | Covers deterministic rationale, immutable trust snapshot, links to asset/evidence/principals/outcome/protection, status transitions through protected, lineage graph reconstruction, and tenant isolation. |
| `P0 value realisation lifecycle covers investment, signals, attribution, protected value, confidence, and no fabricated value` | Workstream 5 | Covers investment, value signal, attribution, verified/protected value calculation, insufficient-evidence, partial-value and confirmed-value verdicts, evidence-backed confidence lift, and no fabricated value without attribution. |
| `P0 authority query remains answer-only with guardrails, source persistence, headless output, and tenant isolation` | Workstream 6 and partial Workstream 7 | Covers unknown intent, supported structured answer, source inclusion/persistence, reduced confidence warning without sources, no action execution/approval/recommendation mutation, headless plain text + structured answer, tenant isolation, and `/api/authority-query/ask`. |

### P0 paths improved

- **First M365 governed execution path:** improved from strong-but-fragmented to explicit P0 lifecycle coverage in a single non-DB test.
- **Approval → execution → verification → outcome → protection:** improved by adding explicit protection and drift assertions, though a production-service full-chain test remains future work.
- **Principal + evidence lifecycle:** improved by adding explicit principal role resolution, action-event recording, raw identity preservation, and evidence links across lifecycle entities.
- **Decision lineage lifecycle:** improved by adding deterministic rationale, immutable trust snapshot, status transition, and graph reconstruction assertions.
- **Value Realisation lifecycle:** improved by adding investment/signal/attribution/verdict coverage and no-fabrication assertions.
- **Authority Query headless answer path:** improved by adding no-approve/no-recommendation-mutation guardrails and route-level `/api/authority-query/ask` coverage.

### Remaining P0 gaps

- The new P0 lifecycle tests intentionally avoid DB and live connector requirements; DB-backed principal authority and production governed-execution services still need dedicated integration coverage when `RUN_DB_INTEGRATION_TESTS=true` and `DATABASE_URL` are available.
- Route-level tests for `/api/decisions/:id/lineage`, `/api/value-realisation/investments/:id/summary`, `/api/workflow-value-graph/workflows/:id/lineage`, `/api/ai-value-attribution/workflows/:id/value`, `/api/ai-economics/investments/:id/economics`, `/api/ai-initiative-portfolio/portfolio-summary`, and `/api/ai-capital-allocation/recommendations` remain open because those route files were not present in the current baseline and adding new product routes is out of scope for this coverage sprint.
- A single production-service integration test that uses the real approval/governed-execution/outcome/protection services end-to-end remains desirable once the existing DB-bound imports can run in the non-DB suite or are explicitly gated as DB integration tests.

### Sprint 17 commands run

```bash
pnpm --filter @workspace/api-server run test -- p0-backend-critical-paths
find artifacts/api-server/src/tests -type f -name '*.test.ts' | wc -l
```

### Final Sprint 17 test counts

| Area | Count after Sprint 17 | Delta |
| --- | ---: | ---: |
| API test files | 1,587 | +1 |
| P0 backend critical-path tests added | 6 | +6 |
| DB-only tests added | 0 | 0 |
| Product source files changed | 0 | 0 |

## Commands run

```bash
pwd && rg --files -g 'AGENTS.md' -g 'package.json' -g 'vitest.config.*' -g '*test*' | head -200
find .. -name AGENTS.md -print
printf 'routes\n'; rg --files artifacts/api-server/src/routes | sort; printf '\npages\n'; rg --files artifacts/control-plane/src | rg '/(pages|app)/|\.tsx$' | head -300; printf '\npackage scripts\n'; cat package.json; cat artifacts/api-server/package.json; cat artifacts/control-plane/package.json
python3 - <<'PY'
from pathlib import Path
routes=sorted(Path('artifacts/api-server/src/routes').glob('*.ts'))
tests=[p.name for p in Path('artifacts/api-server/src/tests').glob('*.test.ts')]
print(len(routes), len(tests))
for r in routes:
    base=r.stem
    hits=[t for t in tests if base in t or base.replace('-','') in t.replace('-','')]
    print(r.name, '=>', ','.join(hits[:3]) or '-')
print('pages')
pages=sorted(Path('artifacts/control-plane/src/pages').glob('*.tsx'))
uit=[p.name for p in Path('artifacts/control-plane/src/lib').glob('*.test.tsx')]
print(len(pages), len(uit))
for p in pages:
    b=p.stem.lower().replace('view','').replace('page','').replace('-','')
    hits=[t for t in uit if b and b in t.lower().replace('-','')]
    print(p.name,'=>',','.join(hits[:3]) or '-')
PY
find artifacts/api-server/src -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l
find artifacts/api-server/src/tests -type f -name '*.test.ts' | wc -l
find artifacts/control-plane/src -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l
find artifacts/control-plane/src/lib -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) | wc -l
rg "describe\(|it\(|test\(" artifacts/api-server/src/tests/authority-query.test.ts artifacts/api-server/src/tests/principal-evidence-registry.test.ts artifacts/api-server/src/tests/asset-registry*.test.ts artifacts/api-server/src/tests/outcome-protection.test.ts artifacts/api-server/src/tests/trust-readiness-authority.test.ts artifacts/api-server/src/tests/executive-proof-packs*.test.ts -n
```

## Known limitations

- This is a static audit, not line/branch/function coverage. The repository uses custom Node-based test runners and no existing coverage script was found.
- Route/page classifications are based on filename/domain matching plus targeted inspection of representative tests. Some tests may exercise routes indirectly without obvious names.
- DB integration coverage was not forced because the baseline allows DB tests to remain skipped unless `DATABASE_URL` is configured.
- No product tests were added because this sprint requested audit-only work and no harness fix was required to collect the static inventory.

## Sprint 17B Reconciliation

Sprint 17B reconciled the discrepancy between the Sprint 14 reported green baseline and the Sprint 17 full api-server failures. The investigation found that Sprint 17's documented P0 validation command was a narrow pattern run, not equivalent to the full api-server suite.

### Failures investigated and classified

| Test/artifact | Classification | Outcome |
| --- | --- | --- |
| `canonical-runtime-context.test.ts` | `TEST_HARNESS_ISSUE` | Added a runtime contract-version export for the export-smoke test. |
| `cloud-data-transfer-economics.test.ts` | `STALE_TEST` | Updated fixture to include enough transfer-risk signals for the review threshold. |
| `cloud-workload-volatility-engine.test.ts` | `STALE_TEST` | Updated fixture to exercise the medium volatility band. |
| `connector-transaction-plan.test.ts` | `STALE_TEST` | Updated fixture to exceed the stale-provider-state threshold. |
| `customer-demo-scenario-m365.json` reference | `WORKING_DIRECTORY_ISSUE` / `MISSING_ARTIFACT` path resolution | Corrected path to repo-level `scripts/fixtures`. |
| `reset-golden-demo.ts` reference | `WORKING_DIRECTORY_ISSUE` / `MISSING_ARTIFACT` path resolution | Corrected path to repo-level `scripts`. |

### Fixes applied

No product feature work was performed. Changes were limited to test reconciliation, path correction, and one runtime export marker used by an existing smoke test.

### Remaining exceptions

DB integration tests remain intentionally gated by the existing api-server harness and are skipped unless `RUN_DB_INTEGRATION_TESTS=true` with database configuration.

### Final counts

- Standard non-DB api-server run: 1,581 test files discovered.
- Failing files after reconciliation: 29 in the full run; 0 among the originally reported four test files after fixes.
- Final baseline verdict: `NOT_CLEAN`.
