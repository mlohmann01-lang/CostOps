import type { TechnicalDebtEntry } from './platform-audit-types';

/**
 * Sprint 8, Workstream 6: single authoritative registry of known technical
 * debt across the platform, consolidating findings from this audit and from
 * Sprint 7's duplicate-concept-audit. Classification only -- no fixes are
 * made here.
 */
export const technicalDebtRegistry: TechnicalDebtEntry[] = [
  {
    id: 'debt:asset-registry-compromise',
    area: 'Asset Registry authority (Sprint 3)',
    severity: 'SHOULD_FIX',
    description: 'Asset Registry has no standalone schema/API identity; its data lives entirely inside Technology Portfolio. Acceptable today but blocks Asset Registry from being assessed/evolved independently.',
    recommendation: 'Defer until a concrete need for an independent Asset Registry surface arises; track via authority-maturity-audit.ts.',
  },
  {
    id: 'debt:legacy-value-funnel-page',
    area: 'value-realization.tsx (Legacy Value Opportunity Funnel)',
    severity: 'ACCEPTED_DEBT',
    description: 'Unrouted legacy page renders a separate enterprise funnel endpoint distinct from the canonical Value Realisation Authority. Sprint 7 relabeled it to remove the naming collision; it has not been deleted or merged.',
    recommendation: 'Future sprint: either re-point the page at the Authority data or delete it once confirmed unused.',
  },
  {
    id: 'debt:ownership-intelligence-overlap',
    area: 'Ownership Intelligence vs Technology Portfolio',
    severity: 'ACCEPTED_DEBT',
    description: 'Ownership Intelligence is a derived risk report over the same asset data Technology Portfolio inventories. The two serve different jobs (inventory vs accountability-gap detection) and are intentionally both kept.',
    recommendation: 'No action required; ensure cross-links so users see them as views, not separate registries (Sprint 7 duplicate-concept-audit disposition: KEEP).',
  },
  {
    id: 'debt:cloud-connector-simulated-execution',
    area: 'AWS / Azure / Snowflake / Databricks execution',
    severity: 'SHOULD_FIX',
    description: 'Execution for these connectors is in-memory state simulation rather than real provider API calls, even though the surrounding policy/dry-run/economic-outcome scaffolding is real and tested. Risk of over-crediting these as production-capable.',
    recommendation: 'Either wire real provider API calls behind the existing controlled-execution scaffolding, or explicitly label these connectors as simulation-only in customer-facing connector status until real calls are wired.',
  },
  {
    id: 'debt:flexera-inferred-lineage',
    area: 'Flexera decision/outcome lineage',
    severity: 'SHOULD_FIX',
    description: 'Decision and outcome linkage for Flexera-sourced assets is reconstructed via name/vendor string matching rather than FK-backed relationships, and no protected-value record yet ties back to Flexera outcomes.',
    recommendation: 'Add FK columns linking Flexera-derived decisions/outcomes to their source assets; extend drift-policy coverage to Flexera-verified outcomes.',
  },
];

export function debtBySeverity(severity: TechnicalDebtEntry['severity']): TechnicalDebtEntry[] {
  return technicalDebtRegistry.filter((entry) => entry.severity === severity);
}
