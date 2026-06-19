import type { PillarStoryReadinessEntry } from './platform-audit-types';

/**
 * Sprint 8, Workstream 7: validates that each of the three pillar narratives
 * (platform-story-registry.ts) can actually be demonstrated end-to-end for a
 * representative connector, with evidence, proof, UI, and data lineage all
 * available.
 */
export const pillarStoryReadinessAudit: PillarStoryReadinessEntry[] = [
  {
    pillar: 'AUTO_EXECUTION',
    exampleConnector: 'M365',
    evidenceAvailable: true,
    proofAvailable: true,
    uiAvailable: true,
    dataLineageAvailable: true,
    notes: 'Full real chain: discovery -> recommendation -> approval -> execution -> evidence, surfaced in Actions/Approval Center/Execution UI and GOVERNED_ACTIONS proof pack section.',
  },
  {
    pillar: 'VALUE_REALISATION',
    exampleConnector: 'M365 + Flexera',
    evidenceAvailable: true,
    proofAvailable: true,
    uiAvailable: true,
    dataLineageAvailable: false,
    notes: 'M365 lineage is complete; Flexera lineage is inferred rather than FK-backed (decision-lineage-audit.ts), so the combined story is not fully traceable for Flexera-originated value.',
  },
  {
    pillar: 'PROTECTED_GOVERNANCE',
    exampleConnector: 'Outcome Protection (M365)',
    evidenceAvailable: true,
    proofAvailable: true,
    uiAvailable: true,
    dataLineageAvailable: true,
    notes: 'M365 outcome-to-protected-value link exists; drift policy coverage is real though not yet 1:1 with every verified outcome.',
  },
];

export function readinessFor(pillar: PillarStoryReadinessEntry['pillar']): PillarStoryReadinessEntry | undefined {
  return pillarStoryReadinessAudit.find((entry) => entry.pillar === pillar);
}

export function allCriteriaMet(entry: PillarStoryReadinessEntry): boolean {
  return entry.evidenceAvailable && entry.proofAvailable && entry.uiAvailable && entry.dataLineageAvailable;
}
