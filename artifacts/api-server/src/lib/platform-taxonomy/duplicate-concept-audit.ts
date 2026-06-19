export type DuplicateConceptDisposition = 'KEEP' | 'MERGE' | 'RENAME' | 'DEPRECATE';

export interface DuplicateConceptEntry {
  concept: string;
  overlaps: string[];
  disposition: DuplicateConceptDisposition;
  rationale: string;
}

/**
 * Sprint 7, Workstream 8: structured audit of overlapping platform concepts.
 * This is a classification pass only -- no merges/renames/deprecations are
 * executed here, that is deliberately left for a future sprint.
 */
export const duplicateConceptAudit: DuplicateConceptEntry[] = [
  {
    concept: 'value-realization page (/value-realization, /api/enterprise/value-realization)',
    overlaps: ['Value Realisation Authority (/value-realisation, investments/capabilities/attributions)'],
    disposition: 'MERGE',
    rationale: 'Both surfaces claim the "Value Realisation" name but the page renders a separate, older enterprise funnel endpoint while the Authority is the canonical investment-to-outcome ledger. The page should be re-pointed at the Authority data in a future sprint rather than carrying two sources of truth.',
  },
  {
    concept: 'Technology Portfolio',
    overlaps: ['Asset Registry (no standalone page; inventory lives inside Technology Portfolio)'],
    disposition: 'KEEP',
    rationale: 'Technology Portfolio already is the asset registry/inventory surface. There is no separate "Asset Registry" page to merge -- the naming concern is resolved by classifying it under SHARED_PLATFORM rather than introducing a second inventory page.',
  },
  {
    concept: 'Ownership Intelligence',
    overlaps: ['Technology Portfolio (asset/owner fields)'],
    disposition: 'KEEP',
    rationale: 'Ownership Intelligence is a derived risk report (ownership gaps) over the same asset data Technology Portfolio inventories. The two serve different jobs (inventory vs. accountability-gap detection); keep both but ensure cross-links so users see them as views, not separate registries.',
  },
  {
    concept: 'Outcome Authority concepts (outcomes, outcome-finance-reconciliation, economic-outcomes)',
    overlaps: ['Value Realisation Authority'],
    disposition: 'RENAME',
    rationale: 'These routes/services implement outcome verification and financial reconciliation that feed the Value Realisation story but are exposed under separate "Authority/Reconciliation" names. Rename user-facing labels to fold under "Value Realisation" / "Outcomes" without touching the underlying services.',
  },
  {
    concept: 'Decision Authority',
    overlaps: ['Decision Context (UI label already in use)'],
    disposition: 'RENAME',
    rationale: 'Backend service/route names retain "Authority" terminology (internal/admin-appropriate) while user-facing surfaces already show "Decision Context". No further UI change needed; flagged here so future authority-named services follow the same UI relabeling convention.',
  },
  {
    concept: 'Evidence Registry',
    overlaps: ['Evidence (nav label), EvidenceContext (context card)'],
    disposition: 'RENAME',
    rationale: 'User-facing nav and context card already say "Evidence". Backend keeps "Evidence Registry" for the admin/platform API, consistent with the terminology rule of avoiding "Registry" outside platform/admin contexts.',
  },
];

export function duplicateConceptAuditCompletes(): boolean {
  return duplicateConceptAudit.every((entry) => Boolean(entry.concept) && entry.overlaps.length > 0 && Boolean(entry.rationale));
}
