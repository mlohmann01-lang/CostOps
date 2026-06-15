export const PersistenceCollections = {
  GOVERNED_ACTIONS: "governed_actions",
  GOVERNED_ACTION_EVENTS: "governed_action_events",

  APPROVAL_REQUESTS: "approval_requests",
  APPROVAL_DECISIONS: "approval_decisions",
  APPROVAL_RULES: "approval_rules",
  APPROVAL_REPORTS: "approval_reports",

  TRUST_READINESS_REPORTS: "trust_readiness_reports",

  GOVERNED_EXECUTIONS: "governed_executions",
  EXECUTION_EVIDENCE: "execution_evidence",

  ECONOMIC_OUTCOMES: "economic_outcomes",
  BUSINESS_OBJECTIVES: "business_objectives",
  VALUE_SIGNALS: "value_signals",
  OUTCOME_ATTRIBUTIONS: "outcome_attributions",
  ECONOMIC_DECISIONS: "economic_decisions",
  OUTCOME_EVIDENCE: "outcome_evidence",

  PROTECTED_OUTCOMES: "protected_outcomes",
  DRIFT_POLICIES: "drift_policies",
  DRIFT_SIGNALS: "drift_signals",
  DRIFT_FINDINGS: "drift_findings",
  RETENTION_CHECKS: "retention_checks",
  DRIFT_REMEDIATION_ACTIONS: "drift_remediation_actions",

  EXECUTIVE_PROOF_PACKS: "executive_proof_packs",

  PORTFOLIO_ASSETS: "portfolio_assets",
  PORTFOLIO_OWNERS: "portfolio_owners",
  PORTFOLIO_CONTRACTS: "portfolio_contracts",
  PORTFOLIO_RENEWALS: "portfolio_renewals",

  ONBOARDING_AUTHORITIES: "onboarding_authorities",

  CERTIFIED_WEDGE_REGISTRY_SNAPSHOTS: "certified_wedge_registry_snapshots",

  CONNECTOR_HEALTH_REPORTS: "connector_health_reports",
  TENANT_EXECUTION_POLICIES: "tenant_execution_policies",
  EVIDENCE_EXPORT_READINESS: "evidence_export_readiness",
  AUDIT_COMPLETENESS: "audit_completeness",

  PLATFORM_EVENTS: "platform_events",

  ECONOMIC_GRAPH_NODES: "economic_graph_nodes",
  ECONOMIC_GRAPH_EDGES: "economic_graph_edges",
} as const;

export type PersistenceCollection = (typeof PersistenceCollections)[keyof typeof PersistenceCollections];

export const ALL_COLLECTIONS: string[] = Object.values(PersistenceCollections);
