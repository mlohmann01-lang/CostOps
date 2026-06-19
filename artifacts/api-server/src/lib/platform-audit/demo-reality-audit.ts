import type { DemoRealityEntry } from './platform-audit-types';

/**
 * Sprint 8, Workstream 4: inventories customer-facing hooks/pages/routes and
 * classifies whether they ever silently substitute demo data for a live
 * tenant. LIVE_ONLY/LIVE_WITH_EMPTY_STATE pages are safe (they show an
 * explicit empty/not-connected state instead of fabricating data).
 * DEMO_CAPABLE pages show demo data only when an explicit isDemo flag is
 * set. DEMO_ONLY pages have no live data path at all.
 */
export const demoRealityAudit: DemoRealityEntry[] = [
  { surface: 'TechnologyPortfolio.tsx', kind: 'PAGE', classification: 'LIVE_WITH_EMPTY_STATE', notes: 'Renders EmptyState when no live snapshot; demo mode is explicit via isDemo flag.' },
  { surface: 'EvidenceRegistry.tsx', kind: 'PAGE', classification: 'LIVE_WITH_EMPTY_STATE', notes: 'Renders EmptyState when unavailable; demo mode is explicit via isDemo flag.' },
  { surface: 'ExecutiveProofPacks.tsx', kind: 'PAGE', classification: 'LIVE_WITH_EMPTY_STATE', notes: 'Empty state present; no silent demo fallback found.' },
  { surface: 'useApprovalCenterData.fetchApprovalDetail', kind: 'HOOK', classification: 'LIVE_WITH_EMPTY_STATE', notes: 'RESOLVED (Sprint 8B). Before: catch block returned buildDemoApprovalDetail(id) on fetch failure without surfacing an error/dataState change, indistinguishable from a silent live-to-demo fallback. After: fetchApprovalDetail now returns an explicit dataState (LIVE/NO_DATA/NOT_CONNECTED/DEMO) and builds a NOT_CONNECTED/NO_DATA detail from the known summary record via unavailableApprovalDetail() instead of fabricating demo content; demo data is only returned when workspace.mode === "demo".' },
  { surface: 'useOutcomeProtectionData.fetchOutcomeDetail', kind: 'HOOK', classification: 'LIVE_WITH_EMPTY_STATE', notes: 'RESOLVED (Sprint 8B). Before: catch block returned buildDemoOutcomeDetail(id) silently on any fetch failure. After: fetchOutcomeDetail now returns an explicit dataState (LIVE/NO_DATA/NOT_CONNECTED/DEMO) and builds a NOT_CONNECTED/NO_DATA detail from the known summary record via unavailableOutcomeDetail() instead of fabricating demo content; demo data is only returned when workspace.mode === "demo".' },
  { surface: 'value-realization.tsx (Legacy Value Opportunity Funnel)', kind: 'PAGE', classification: 'DEMO_ONLY', notes: 'Unrouted legacy page (Sprint 7 relabeled); not reachable by customers via any App.tsx route today.' },
  { surface: 'onboarding.tsx', kind: 'PAGE', classification: 'LIVE_WITH_EMPTY_STATE', notes: 'Story-registry narrative copy added Sprint 7; no demo data fallback.' },
  { surface: 'pilot-readiness.tsx', kind: 'PAGE', classification: 'LIVE_WITH_EMPTY_STATE', notes: 'Story-registry narrative copy added Sprint 7; no demo data fallback.' },
  { surface: 'executive-dashboard.tsx', kind: 'PAGE', classification: 'LIVE_WITH_EMPTY_STATE', notes: 'Story-registry narrative copy added Sprint 7; no demo data fallback.' },
];

export function silentFallbackRisks(): DemoRealityEntry[] {
  return demoRealityAudit.filter((entry) => entry.classification === 'DEMO_CAPABLE');
}
