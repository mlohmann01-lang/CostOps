import type { Pillar, SurfaceEntry } from './pillar-taxonomy-types';

/**
 * Sprint 7 "Pillar Alignment" inventory. Every major nav item, page, API route,
 * proof pack section and context card is classified into one of Certen's three
 * pillars (or SHARED_PLATFORM for cross-pillar/admin infrastructure). This is a
 * read-only classification registry -- it does not introduce new capability,
 * authority, or routes; it only labels what already exists.
 */

const navItems: SurfaceEntry[] = [
  { id: 'nav:actions', kind: 'NAV_ITEM', label: 'Actions', pillar: 'AUTO_EXECUTION' },
  { id: 'nav:approval-center', kind: 'NAV_ITEM', label: 'Approval Center', pillar: 'AUTO_EXECUTION' },
  { id: 'nav:execution', kind: 'NAV_ITEM', label: 'Execution', pillar: 'AUTO_EXECUTION' },
  { id: 'nav:first-outcome', kind: 'NAV_ITEM', label: 'First Outcome', pillar: 'VALUE_REALISATION' },
  { id: 'nav:outcomes', kind: 'NAV_ITEM', label: 'Outcomes', pillar: 'VALUE_REALISATION' },
  { id: 'nav:executive-value', kind: 'NAV_ITEM', label: 'Executive Value', pillar: 'VALUE_REALISATION' },
  { id: 'nav:executive-outcome-dashboard', kind: 'NAV_ITEM', label: 'Executive Outcome Dashboard', pillar: 'VALUE_REALISATION' },
  { id: 'nav:proof-packs', kind: 'NAV_ITEM', label: 'Proof Packs', pillar: 'VALUE_REALISATION' },
  { id: 'nav:outcome-protection', kind: 'NAV_ITEM', label: 'Outcome Protection', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'nav:governance', kind: 'NAV_ITEM', label: 'Governance', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'nav:executive-risk', kind: 'NAV_ITEM', label: 'Executive Risk', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'nav:overview', kind: 'NAV_ITEM', label: 'Overview', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:technology-portfolio', kind: 'NAV_ITEM', label: 'Technology Portfolio', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:evidence', kind: 'NAV_ITEM', label: 'Evidence', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:workspace', kind: 'NAV_ITEM', label: 'Workspace', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:tenant-readiness', kind: 'NAV_ITEM', label: 'Tenant Readiness', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:live-tenant-readiness', kind: 'NAV_ITEM', label: 'Live Tenant Readiness', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:connectors', kind: 'NAV_ITEM', label: 'Connectors', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:connector-capability-registry', kind: 'NAV_ITEM', label: 'Connector Capability Registry', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:platform-operations', kind: 'NAV_ITEM', label: 'Platform Operations', pillar: 'SHARED_PLATFORM' },
  { id: 'nav:settings', kind: 'NAV_ITEM', label: 'Settings', pillar: 'SHARED_PLATFORM' },
];

const routes: SurfaceEntry[] = [
  { id: 'route:actions', kind: 'ROUTE', label: 'actions', pillar: 'AUTO_EXECUTION' },
  { id: 'route:approval-authority', kind: 'ROUTE', label: 'approval-authority', pillar: 'AUTO_EXECUTION' },
  { id: 'route:approval-workflows', kind: 'ROUTE', label: 'approval-workflows', pillar: 'AUTO_EXECUTION' },
  { id: 'route:approvals', kind: 'ROUTE', label: 'approvals', pillar: 'AUTO_EXECUTION' },
  { id: 'route:campaigns', kind: 'ROUTE', label: 'campaigns', pillar: 'AUTO_EXECUTION' },
  { id: 'route:execution', kind: 'ROUTE', label: 'execution', pillar: 'AUTO_EXECUTION' },
  { id: 'route:execution-dry-run', kind: 'ROUTE', label: 'execution-dry-run', pillar: 'AUTO_EXECUTION' },
  { id: 'route:execution-orchestration', kind: 'ROUTE', label: 'execution-orchestration', pillar: 'AUTO_EXECUTION' },
  { id: 'route:execution-requests', kind: 'ROUTE', label: 'execution-requests', pillar: 'AUTO_EXECUTION' },
  { id: 'route:execution-results-outcome', kind: 'ROUTE', label: 'execution-results-outcome', pillar: 'AUTO_EXECUTION' },
  { id: 'route:execution-runtime', kind: 'ROUTE', label: 'execution-runtime', pillar: 'AUTO_EXECUTION' },
  { id: 'route:governed-execution', kind: 'ROUTE', label: 'governed-execution', pillar: 'AUTO_EXECUTION' },
  { id: 'route:opportunities', kind: 'ROUTE', label: 'opportunities', pillar: 'AUTO_EXECUTION' },
  { id: 'route:opportunity-factory', kind: 'ROUTE', label: 'opportunity-factory', pillar: 'AUTO_EXECUTION' },
  { id: 'route:playbooks', kind: 'ROUTE', label: 'playbooks', pillar: 'AUTO_EXECUTION' },
  { id: 'route:priorities', kind: 'ROUTE', label: 'priorities', pillar: 'AUTO_EXECUTION' },
  { id: 'route:recommendations', kind: 'ROUTE', label: 'recommendations', pillar: 'AUTO_EXECUTION' },
  { id: 'route:schedules', kind: 'ROUTE', label: 'schedules', pillar: 'AUTO_EXECUTION' },
  { id: 'route:simulations', kind: 'ROUTE', label: 'simulations', pillar: 'AUTO_EXECUTION' },
  { id: 'route:workflow', kind: 'ROUTE', label: 'workflow', pillar: 'AUTO_EXECUTION' },

  { id: 'route:economic-outcomes', kind: 'ROUTE', label: 'economic-outcomes', pillar: 'VALUE_REALISATION' },
  { id: 'route:executive-value', kind: 'ROUTE', label: 'executive-value', pillar: 'VALUE_REALISATION' },
  { id: 'route:executive-proof-packs', kind: 'ROUTE', label: 'executive-proof-packs', pillar: 'VALUE_REALISATION' },
  { id: 'route:outcome-finance-reconciliation', kind: 'ROUTE', label: 'outcome-finance-reconciliation', pillar: 'VALUE_REALISATION' },
  { id: 'route:outcomes', kind: 'ROUTE', label: 'outcomes', pillar: 'VALUE_REALISATION' },
  { id: 'route:value-realisation', kind: 'ROUTE', label: 'value-realisation', pillar: 'VALUE_REALISATION' },
  { id: 'route:decisions', kind: 'ROUTE', label: 'decisions', pillar: 'VALUE_REALISATION' },

  { id: 'route:governance', kind: 'ROUTE', label: 'governance', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:governance-exceptions', kind: 'ROUTE', label: 'governance-exceptions', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:evidence-packs', kind: 'ROUTE', label: 'evidence-packs', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:evidence-registry', kind: 'ROUTE', label: 'evidence-registry', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:outcome-protection', kind: 'ROUTE', label: 'outcome-protection', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:audit-packs', kind: 'ROUTE', label: 'audit-packs', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:trust', kind: 'ROUTE', label: 'trust', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:trust-readiness', kind: 'ROUTE', label: 'trust-readiness', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:security', kind: 'ROUTE', label: 'security', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:verification', kind: 'ROUTE', label: 'verification', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:drift', kind: 'ROUTE', label: 'drift', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'route:vendor-changes', kind: 'ROUTE', label: 'vendor-changes', pillar: 'PROTECTED_GOVERNANCE' },

  { id: 'route:ai', kind: 'ROUTE', label: 'ai', pillar: 'SHARED_PLATFORM' },
  { id: 'route:auth', kind: 'ROUTE', label: 'auth', pillar: 'SHARED_PLATFORM' },
  { id: 'route:connector-adapters', kind: 'ROUTE', label: 'connector-adapters', pillar: 'SHARED_PLATFORM' },
  { id: 'route:connector-contract-testing', kind: 'ROUTE', label: 'connector-contract-testing', pillar: 'SHARED_PLATFORM' },
  { id: 'route:connector-readiness', kind: 'ROUTE', label: 'connector-readiness', pillar: 'SHARED_PLATFORM' },
  { id: 'route:connectors', kind: 'ROUTE', label: 'connectors', pillar: 'SHARED_PLATFORM' },
  { id: 'route:contracts', kind: 'ROUTE', label: 'contracts', pillar: 'SHARED_PLATFORM' },
  { id: 'route:dashboard', kind: 'ROUTE', label: 'dashboard', pillar: 'SHARED_PLATFORM' },
  { id: 'route:demo', kind: 'ROUTE', label: 'demo', pillar: 'SHARED_PLATFORM' },
  { id: 'route:discovery', kind: 'ROUTE', label: 'discovery', pillar: 'SHARED_PLATFORM' },
  { id: 'route:economic-control-chain', kind: 'ROUTE', label: 'economic-control-chain', pillar: 'SHARED_PLATFORM' },
  { id: 'route:economic-operations', kind: 'ROUTE', label: 'economic-operations', pillar: 'SHARED_PLATFORM' },
  { id: 'route:enterprise', kind: 'ROUTE', label: 'enterprise', pillar: 'SHARED_PLATFORM' },
  { id: 'route:erp', kind: 'ROUTE', label: 'erp', pillar: 'SHARED_PLATFORM' },
  { id: 'route:events', kind: 'ROUTE', label: 'events', pillar: 'SHARED_PLATFORM' },
  { id: 'route:flexera', kind: 'ROUTE', label: 'flexera', pillar: 'SHARED_PLATFORM' },
  { id: 'route:graph', kind: 'ROUTE', label: 'graph', pillar: 'SHARED_PLATFORM' },
  { id: 'route:health', kind: 'ROUTE', label: 'health', pillar: 'SHARED_PLATFORM' },
  { id: 'route:jobs', kind: 'ROUTE', label: 'jobs', pillar: 'SHARED_PLATFORM' },
  { id: 'route:live-tenant-readiness', kind: 'ROUTE', label: 'live-tenant-readiness', pillar: 'SHARED_PLATFORM' },
  { id: 'route:onboarding', kind: 'ROUTE', label: 'onboarding', pillar: 'SHARED_PLATFORM' },
  { id: 'route:operationalization', kind: 'ROUTE', label: 'operationalization', pillar: 'SHARED_PLATFORM' },
  { id: 'route:packs', kind: 'ROUTE', label: 'packs', pillar: 'SHARED_PLATFORM' },
  { id: 'route:pilot', kind: 'ROUTE', label: 'pilot', pillar: 'SHARED_PLATFORM' },
  { id: 'route:platform-events', kind: 'ROUTE', label: 'platform-events', pillar: 'SHARED_PLATFORM' },
  { id: 'route:procurement-ap', kind: 'ROUTE', label: 'procurement-ap', pillar: 'SHARED_PLATFORM' },
  { id: 'route:production-connectors', kind: 'ROUTE', label: 'production-connectors', pillar: 'SHARED_PLATFORM' },
  { id: 'route:reconciliation', kind: 'ROUTE', label: 'reconciliation', pillar: 'SHARED_PLATFORM' },
  { id: 'route:renewals', kind: 'ROUTE', label: 'renewals', pillar: 'SHARED_PLATFORM' },
  { id: 'route:runtime', kind: 'ROUTE', label: 'runtime', pillar: 'SHARED_PLATFORM' },
  { id: 'route:runtime-observability', kind: 'ROUTE', label: 'runtime-observability', pillar: 'SHARED_PLATFORM' },
  { id: 'route:runtime-recovery', kind: 'ROUTE', label: 'runtime-recovery', pillar: 'SHARED_PLATFORM' },
  { id: 'route:servicenow', kind: 'ROUTE', label: 'servicenow', pillar: 'SHARED_PLATFORM' },
  { id: 'route:technology-commercial-authority', kind: 'ROUTE', label: 'technology-commercial-authority', pillar: 'SHARED_PLATFORM' },
  { id: 'route:technology-portfolio', kind: 'ROUTE', label: 'technology-portfolio', pillar: 'SHARED_PLATFORM' },
  { id: 'route:financial-truth-authority', kind: 'ROUTE', label: 'financial-truth-authority', pillar: 'SHARED_PLATFORM' },
  { id: 'route:ownership-intelligence', kind: 'ROUTE', label: 'ownership-intelligence', pillar: 'SHARED_PLATFORM' },
  { id: 'route:telemetry', kind: 'ROUTE', label: 'telemetry', pillar: 'SHARED_PLATFORM' },
  { id: 'route:tenant-pricing', kind: 'ROUTE', label: 'tenant-pricing', pillar: 'SHARED_PLATFORM' },
  { id: 'route:benchmarks', kind: 'ROUTE', label: 'benchmarks', pillar: 'SHARED_PLATFORM' },
  { id: 'route:utilization', kind: 'ROUTE', label: 'utilization', pillar: 'SHARED_PLATFORM' },
  { id: 'route:workspace', kind: 'ROUTE', label: 'workspace', pillar: 'SHARED_PLATFORM' },
];

const proofPackSections: SurfaceEntry[] = [
  { id: 'proof-pack:executive-summary', kind: 'PROOF_PACK_SECTION', label: 'EXECUTIVE_SUMMARY', pillar: 'SHARED_PLATFORM', notes: 'Cross-pillar narrative summary' },
  { id: 'proof-pack:value-summary', kind: 'PROOF_PACK_SECTION', label: 'VALUE_SUMMARY', pillar: 'VALUE_REALISATION' },
  { id: 'proof-pack:finance-verification', kind: 'PROOF_PACK_SECTION', label: 'FINANCE_VERIFICATION', pillar: 'VALUE_REALISATION' },
  { id: 'proof-pack:portfolio-position', kind: 'PROOF_PACK_SECTION', label: 'PORTFOLIO_POSITION', pillar: 'SHARED_PLATFORM' },
  { id: 'proof-pack:commercial-exposure', kind: 'PROOF_PACK_SECTION', label: 'COMMERCIAL_EXPOSURE', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'proof-pack:renewal-risk', kind: 'PROOF_PACK_SECTION', label: 'RENEWAL_RISK', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'proof-pack:ownership-accountability', kind: 'PROOF_PACK_SECTION', label: 'OWNERSHIP_ACCOUNTABILITY', pillar: 'SHARED_PLATFORM' },
  { id: 'proof-pack:evidence-coverage', kind: 'PROOF_PACK_SECTION', label: 'EVIDENCE_COVERAGE', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'proof-pack:governed-actions', kind: 'PROOF_PACK_SECTION', label: 'GOVERNED_ACTIONS', pillar: 'AUTO_EXECUTION' },
  { id: 'proof-pack:outcome-verification', kind: 'PROOF_PACK_SECTION', label: 'OUTCOME_VERIFICATION', pillar: 'VALUE_REALISATION' },
  { id: 'proof-pack:risk-register', kind: 'PROOF_PACK_SECTION', label: 'RISK_REGISTER', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'proof-pack:recommendations', kind: 'PROOF_PACK_SECTION', label: 'RECOMMENDATIONS', pillar: 'AUTO_EXECUTION' },
  { id: 'proof-pack:audit-trail', kind: 'PROOF_PACK_SECTION', label: 'AUDIT_TRAIL', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'proof-pack:operating-next-steps', kind: 'PROOF_PACK_SECTION', label: 'OPERATING_NEXT_STEPS', pillar: 'AUTO_EXECUTION' },
];

const contextCards: SurfaceEntry[] = [
  { id: 'card:value-realisation', kind: 'CONTEXT_CARD', label: 'ValueRealisationContext', pillar: 'VALUE_REALISATION' },
  { id: 'card:decision', kind: 'CONTEXT_CARD', label: 'DecisionContext', pillar: 'VALUE_REALISATION', notes: 'Decision precedes outcome in the value story' },
  { id: 'card:asset', kind: 'CONTEXT_CARD', label: 'AssetContext', pillar: 'SHARED_PLATFORM' },
  { id: 'card:evidence', kind: 'CONTEXT_CARD', label: 'EvidenceContext', pillar: 'PROTECTED_GOVERNANCE' },
];

const dashboardMetrics: SurfaceEntry[] = [
  { id: 'metric:opportunities-executed', kind: 'DASHBOARD_METRIC', label: 'opportunitiesExecuted', pillar: 'AUTO_EXECUTION' },
  { id: 'metric:actions-completed', kind: 'DASHBOARD_METRIC', label: 'actionsCompleted', pillar: 'AUTO_EXECUTION' },
  { id: 'metric:projected-value', kind: 'DASHBOARD_METRIC', label: 'projectedValue', pillar: 'VALUE_REALISATION' },
  { id: 'metric:verified-value', kind: 'DASHBOARD_METRIC', label: 'verifiedValue', pillar: 'VALUE_REALISATION' },
  { id: 'metric:protected-value', kind: 'DASHBOARD_METRIC', label: 'protectedValue', pillar: 'PROTECTED_GOVERNANCE' },
  { id: 'metric:drift-prevented', kind: 'DASHBOARD_METRIC', label: 'driftPrevented', pillar: 'PROTECTED_GOVERNANCE' },
];

export const pillarTaxonomyAudit: SurfaceEntry[] = [
  ...navItems,
  ...routes,
  ...proofPackSections,
  ...contextCards,
  ...dashboardMetrics,
];

export function surfacesForPillar(pillar: Pillar): SurfaceEntry[] {
  return pillarTaxonomyAudit.filter((entry) => entry.pillar === pillar);
}

export function surfacesByKind(kind: SurfaceEntry['kind']): SurfaceEntry[] {
  return pillarTaxonomyAudit.filter((entry) => entry.kind === kind);
}

export function findOrphanedSurfaces(ids: string[]): string[] {
  const known = new Set(pillarTaxonomyAudit.map((entry) => entry.id));
  return ids.filter((id) => !known.has(id));
}
