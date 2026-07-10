export type Pillar = 'AUTO_EXECUTION' | 'VALUE_REALISATION' | 'PROTECTED_GOVERNANCE' | 'SHARED_PLATFORM';

export type SurfaceKind = 'PAGE' | 'NAV_ITEM' | 'ROUTE' | 'PROOF_PACK_SECTION' | 'CONTEXT_CARD' | 'DASHBOARD_METRIC';

export interface SurfaceEntry {
  id: string;
  kind: SurfaceKind;
  label: string;
  pillar: Pillar;
  notes?: string;
}
