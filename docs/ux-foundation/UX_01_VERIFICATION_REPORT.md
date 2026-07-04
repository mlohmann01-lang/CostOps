# UX-01 Verification & Technical Debt Closure Report

This audit verifies whether the current control-plane UX foundation is reusable enough for future page redesign work. It intentionally records architectural gaps without changing product behaviour, schemas, or business logic.

## 1. UX Foundation Verification Report

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Platform Page Registry | PARTIAL | `artifacts/control-plane/src/lib/navigation/nav-registry.ts` defines a route/navigation registry with label, path, icon, enabled, pageExists, stability, and group metadata. `artifacts/control-plane/src/components/layout/Sidebar.tsx` defines a separate `NAV_GROUPS` structure consumed directly by the sidebar. | No canonical registry with required `workspace`, `archetype`, `executive question`, `persona`, and `primary decision` metadata was found. Duplicates exist between `nav-registry.ts`, `Sidebar.tsx`, and route declarations in `App.tsx`. |
| Registry Single Source of Truth | NOT IMPLEMENTED | `Sidebar.tsx` consumes local `NAV_GROUPS`; `nav-registry.ts` exposes `visibleNavItems` but the current sidebar does not consume it. | Sidebar metadata is duplicated and route metadata is still embedded in `App.tsx` tests and page files. |
| Executive Dashboard archetype | PARTIAL | `components/executive/ExecutivePageShell.tsx`, `ExecutivePageHeader.tsx`, `ExecutiveSection.tsx`, `MetricCard.tsx`, `ExecutiveKpiCard.tsx`; consumed by `ExecutiveValueDashboard.tsx`, `ExecutiveRiskCommandCenter.tsx`, `SaaSRationalisation.tsx`, and `ShadowITExposure.tsx`. | Reusable executive primitives exist, but there is no named `ExecutiveDashboardLayout` archetype that binds registry metadata, runtime state, hero, KPI strip, sections, and empty states. |
| Lifecycle Dashboard archetype | PARTIAL | Lifecycle pages such as `ActionCenter.tsx`, `OutcomeLedgerView.tsx`, and `OutcomeProtectionView.tsx` reuse shared cards/status/empty state components. | Lifecycle structure is repeated in page-level JSX rather than extracted as a reusable archetype. |
| Workflow Dashboard archetype | PARTIAL | Workflow pages such as `ApprovalWorkflowsView.tsx`, `ActionCenter.tsx`, and execution surfaces use shared foundation components. | No canonical workflow layout component found. |
| Discovery Dashboard archetype | PARTIAL | Discovery/intelligence pages (`VendorIntelligenceView.tsx`, `UtilizationIntelligenceView.tsx`, `ContractIntelligenceView.tsx`, `TechnologyPortfolio.tsx`) use shared foundation components and sidebar aliases. | Discovery page shape is duplicated per page. |
| Registry Dashboard archetype | PARTIAL | Registry-style surfaces include `EvidenceRegistry`, `ConnectorCapabilityRegistry`, `TechnologyPortfolio`, and platform/intelligence tables. | Registry table/list layout is not extracted into a reusable archetype. |
| Operations Dashboard archetype | PARTIAL | `RuntimeHealthView.tsx`, `connector-operations.tsx`, `AuditLogPage.tsx`, and operational pages use `MetricCard`, `StatusPill`, `SectionLabel`, and `EmptyState`. | Operations layout remains page-local. |
| Shared Component Library | PARTIAL | `components/executive/*`, `components/shared/Foundation.tsx`, `components/command/*`, and page-local components provide most visual primitives. | Duplicate implementations exist for `MetricCard`, `EmptyState`, status chips/badges, action cards, and KPI cards. Several expected components are missing or page-local only. |
| Sidebar Source of Truth | NOT IMPLEMENTED | `Sidebar.tsx` defines `NAV_GROUPS` independently; `nav-registry.ts` defines `navRegistry`; `App.tsx` separately declares routes. | Sidebar is not driven from the platform page registry. Hidden sidebar text is also present for source-string/test coverage. |
| Runtime Model | PARTIAL | `runtimeContext.tsx` supports `DEMO` and `LIVE`; many hooks/pages use workspace/data state flags such as demo/live, `isEmptyLive`, `NOT_CONNECTED`, and `NO_DATA`. | Required states `DEMO`, `LIVE_UNCONNECTED`, `LIVE_DISCOVERING`, and `LIVE_OPERATIONAL` were not found as one shared page runtime model. Runtime handling is fragmented across hooks/pages. |
| Executive Pattern: Executive Command Center | PARTIAL | `ExecutiveValueDashboard.tsx`, `ExecutiveRiskCommandCenter.tsx`, `CommandView.tsx`, and overview/dashboard surfaces use executive/shared primitives. | Hero/header, KPI language, cards, typography, runtime banners, and empty states are not fully standardized across command-center variants. |
| Executive Pattern: Outcome Ledger | PARTIAL | `OutcomeLedgerView.tsx` uses `Shell`, `DataStateBanner`, `EmptyState`, `StatusPill`, and `SectionLabel`. | Outcome Ledger still uses page-local layout/spacing and shared Foundation components, not the newer executive component set. |

## 2. Shared Component Inventory

| Component | Used By | Duplicate? |
| --- | --- | --- |
| ExecutiveHero | Not found as a component. Similar responsibility appears in `ExecutivePageHeader` and page-local headers. | YES - page-local hero/header copy. |
| ExecutiveHealthBar | Not found as a component. | N/A |
| ExecutiveNarrative | `ExecutiveNarrativeOverlay.tsx` exists; narrative blocks also appear page-local in command/intelligence pages. | YES |
| MetricHero | Not found as named component; `MetricCard` supports a `hero` prop in `shared/Foundation.tsx`. | YES |
| MetricCard | `components/shared/Foundation.tsx`, `components/executive/MetricCard.tsx`, and private `components/command/MetricStrip.tsx` card. Used by many dashboards and executive pages. | YES |
| MetricStrip | `components/command/MetricStrip.tsx`; used by command-style pages. | PARTIAL - includes private MetricCard implementation. |
| WaterfallChart | Not found. | N/A |
| PipelineBoard | Not found as shared component; pipeline sections are page-local. | YES |
| PipelineCard | Not found as shared component; cards are page-local. | YES |
| Timeline | Shared timeline-like components exist under `components/timeline`; page-local timeline markup also exists. | YES |
| TimelineEvent | Shared timeline event component exists under `components/timeline`; page-local event rows also exist. | YES |
| EvidenceBadge | `components/executive/EvidenceBadge.tsx`; used by SaaS, Shadow IT, and executive risk pages. | NO significant duplicate found, but `AuthorityBadge`/status badges overlap conceptually. |
| ConfidenceBadge | Not found as named component; confidence rendered by `EvidenceBadge`, `StatusChip`, `StatusPill`, and page-local badges. | YES |
| LeakageChart | Not found. | N/A |
| RiskDonut | Not found as named component; `ExecutiveDonutChart.tsx` exists. | PARTIAL |
| StatusChip | `components/executive/StatusChip.tsx`; used by executive pages. | YES - `StatusPill`, `StatusBadge`, and `RiskBadge` overlap. |
| InsightPanel | Not found as shared component; insight panels are page-local sections/cards. | YES |
| ActionCard | Page-local `ActionCard` in `ActionCenter.tsx`. | YES - should become shared before workflow redesigns. |
| DecisionCard | Not found as shared component. | N/A |
| EmptyState | `components/shared/Foundation.tsx` and `components/executive/EmptyState.tsx`; consumed widely. | YES |
| LiveStateBanner | Not found by exact name; `RuntimeStateNotice`, `DataStateBanner`, `WorkspaceModeBanner`, and `DemoModeBanner` cover overlapping responsibilities. | YES |

## 3. Hidden Test String Inventory

| File | Purpose | Classification | Recommendation |
| --- | --- | --- | --- |
| `artifacts/control-plane/src/components/layout/Sidebar.tsx` | `<div style={{display:'none'}}>` contains intelligence labels that are not visible to users. | REMOVE | Replace all source-string coverage with assertions against exported navigation data or rendered navigation aliases, then remove the hidden block in a follow-up cleanup. |
| `artifacts/control-plane/src/lib/*` tests using `fs.readFileSync(...).includes(...)` | Source-presence assertions for routes, labels, API strings, and UI copy. | TEMPORARY | Prefer rendered React assertions for visible UI, imported constants for navigation/API contracts, and behavior-level tests for runtime/demo/live logic. This sprint improved the Vendor and Utilization nav tests to use `NAV_GROUPS` instead of reading sidebar source. |
| Accessibility-only or runtime state labels | No clearly test-only accessibility text was identified in this focused audit. | ACCEPTABLE | Retain when it improves accessible names, roles, or runtime clarity. |

## 4. Technical Debt List

1. Create a canonical `platformPageRegistry` containing route, workspace, archetype, executive question, persona, primary decision, icon, nav grouping, aliases, and runtime policy for every page.
2. Derive `Sidebar` navigation and route metadata from that registry; remove duplicate `NAV_GROUPS`, `navRegistry`, route metadata, and hidden sidebar marker text.
3. Implement the four-state shared runtime model (`DEMO`, `LIVE_UNCONNECTED`, `LIVE_DISCOVERING`, `LIVE_OPERATIONAL`) and provide a single page-level runtime hook/binder.
4. Extract six named dashboard archetype layouts and migrate pages incrementally: Executive, Lifecycle, Workflow, Discovery, Registry, and Operations.
5. Consolidate duplicated shared components, starting with `MetricCard`, `EmptyState`, status/confidence badges, runtime banners, and page-local `ActionCard`.
6. Convert remaining source-presence tests to rendered UI/behavior tests or imported contract assertions.
7. Align Executive Command Center and Outcome Ledger on one executive shell: common hero/header, KPI language, spacing scale, cards, typography, runtime banners, and empty states.
