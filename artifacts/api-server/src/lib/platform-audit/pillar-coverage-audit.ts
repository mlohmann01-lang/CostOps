import type { PillarCoverageEntry } from './platform-audit-types';

/**
 * Sprint 8, Workstream 2: maps every major capability area to one of
 * Certen's three pillars (or SHARED_PLATFORM) and classifies how complete
 * the implementation is. Complements platform-taxonomy's surface-level
 * inventory (nav/route/proof-pack labels) with a capability-level view.
 */
export const pillarCoverageAudit: PillarCoverageEntry[] = [
  { capability: 'Opportunity discovery & recommendations', pillar: 'AUTO_EXECUTION', status: 'COMPLETE', notes: 'Real recommendation generation from connector data, evidenced end-to-end for M365.' },
  { capability: 'Approval workflows', pillar: 'AUTO_EXECUTION', status: 'COMPLETE', notes: 'Real approval-state machine with persisted records.' },
  { capability: 'Governed execution (M365)', pillar: 'AUTO_EXECUTION', status: 'COMPLETE', notes: 'Real license/seat changes executed via Graph API.' },
  { capability: 'Governed execution (cloud connectors)', pillar: 'AUTO_EXECUTION', status: 'PARTIAL', notes: 'In-memory simulated execution for AWS/Azure/Snowflake/Databricks; policy/dry-run scaffolding is real, provider calls are not.' },
  { capability: 'Execution runtime & dry-run', pillar: 'AUTO_EXECUTION', status: 'COMPLETE', notes: 'Dry-run and orchestration scaffolding is real and connector-agnostic.' },
  { capability: 'Investment-to-outcome ledger (Value Realisation Authority)', pillar: 'VALUE_REALISATION', status: 'PARTIAL', notes: 'Schema and APIs exist; M365 has the most complete real linkage, other connectors rely on inferred linkage.' },
  { capability: 'Finance-verified savings reconciliation', pillar: 'VALUE_REALISATION', status: 'PARTIAL', notes: 'Real for M365; partial elsewhere due to inferred decision/outcome links.' },
  { capability: 'Executive proof packs (value sections)', pillar: 'VALUE_REALISATION', status: 'COMPLETE', notes: 'Pack generation, evidence binding, and pillar tagging (Sprint 7) are implemented and tested.' },
  { capability: 'Outcome protection / drift detection', pillar: 'PROTECTED_GOVERNANCE', status: 'PARTIAL', notes: 'Real for M365; simulated economic-outcome basis for cloud connectors limits how much drift detection actually protects.' },
  { capability: 'Evidence registry & integrity', pillar: 'PROTECTED_GOVERNANCE', status: 'COMPLETE', notes: 'Schema, provenance, integrity checks, and UI exist and are tested.' },
  { capability: 'Risk register / ownership gap detection', pillar: 'PROTECTED_GOVERNANCE', status: 'COMPLETE', notes: 'Ownership Intelligence derives real risk records from Technology Portfolio asset data.' },
  { capability: 'Governance exceptions / trust & readiness', pillar: 'PROTECTED_GOVERNANCE', status: 'PARTIAL', notes: 'Live tenant readiness checks exist for some connectors; coverage across all connectors is uneven.' },
  { capability: 'Technology Portfolio (asset registry)', pillar: 'SHARED_PLATFORM', status: 'COMPLETE', notes: 'Aggregates real connector data into a unified asset/vendor/spend view.' },
  { capability: 'Connector capability registry', pillar: 'SHARED_PLATFORM', status: 'COMPLETE', notes: 'Self-describing capability metadata per connector, used by readiness checks.' },
  { capability: 'Onboarding / pilot readiness', pillar: 'SHARED_PLATFORM', status: 'COMPLETE', notes: 'Story registry now wired into onboarding/readiness copy (Sprint 7).' },
];

export function coverageForPillar(pillar: PillarCoverageEntry['pillar']): PillarCoverageEntry[] {
  return pillarCoverageAudit.filter((entry) => entry.pillar === pillar);
}
