import type { AuthorityMaturityEntry } from './platform-audit-types';

/**
 * Sprint 8, Workstream 5: maturity assessment of Certen's five canonical
 * authorities across schema, APIs, tests, UI exposure, proof pack exposure,
 * and overall production readiness.
 */
export const authorityMaturityAudit: AuthorityMaturityEntry[] = [
  {
    authority: 'Principal Authority',
    schema: 'READY',
    apis: 'READY',
    tests: 'READY',
    uiExposure: 'PARTIAL',
    proofPackExposure: 'PARTIAL',
    productionReadiness: 'READY',
    notes: 'Core identity/ownership model is solid; not every consuming surface (e.g. some proof pack sections) yet displays principal data directly.',
  },
  {
    authority: 'Evidence Registry',
    schema: 'READY',
    apis: 'READY',
    tests: 'READY',
    uiExposure: 'READY',
    proofPackExposure: 'READY',
    productionReadiness: 'READY',
    notes: 'Most mature authority: full schema, tested UI (EvidenceRegistry.tsx), and proof pack EVIDENCE_COVERAGE section.',
  },
  {
    authority: 'Asset Registry',
    schema: 'PARTIAL',
    apis: 'PARTIAL',
    tests: 'PARTIAL',
    uiExposure: 'READY',
    proofPackExposure: 'PARTIAL',
    productionReadiness: 'PARTIAL',
    notes: 'Sprint 3 compromise: no standalone Asset Registry surface; inventory lives inside Technology Portfolio. UI exposure is strong via that page, but the authority itself has no independent schema/API identity. See technical-debt-registry.ts.',
  },
  {
    authority: 'Decision Authority',
    schema: 'READY',
    apis: 'READY',
    tests: 'PARTIAL',
    uiExposure: 'PARTIAL',
    proofPackExposure: 'PARTIAL',
    productionReadiness: 'PARTIAL',
    notes: 'Backend schema/APIs solid for M365; decision linkage for other connectors is inferred rather than FK-backed (see decision-lineage-audit.ts), limiting production readiness.',
  },
  {
    authority: 'Value Realisation Authority',
    schema: 'READY',
    apis: 'READY',
    tests: 'PARTIAL',
    uiExposure: 'PARTIAL',
    proofPackExposure: 'READY',
    productionReadiness: 'PARTIAL',
    notes: 'Strong for M365 end-to-end; partial elsewhere due to inferred lineage. The unrouted legacy value-realization.tsx page (Sprint 7 relabeled, not deleted) remains a UI exposure gap rather than a true second implementation.',
  },
];

export function maturityFor(authority: string): AuthorityMaturityEntry | undefined {
  return authorityMaturityAudit.find((entry) => entry.authority === authority);
}
