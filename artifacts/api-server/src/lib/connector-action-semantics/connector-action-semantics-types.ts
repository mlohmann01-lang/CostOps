export type ConnectorDomain = 'M365'|'SERVICENOW'|'SNOWFLAKE'|'DATABRICKS'|'AWS'|'AZURE'|'GCP'|'ORACLE_GOVERNANCE'|'KUBERNETES_READONLY';
export type CapabilityClass = 'READ_ONLY'|'RECOMMEND_ONLY'|'DRY_RUN'|'APPROVAL_REQUIRED'|'REVERSIBLE_EXECUTION'|'MANUAL_ONLY'|'NEVER_ALLOWED';
export type RiskClass = 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
export type ReversibilityClass = 'FULL'|'PARTIAL'|'NONE';
export type IdempotencyClass = 'IDEMPOTENT'|'CONDITIONAL'|'NON_IDEMPOTENT';
export type ApprovalTier = 'NONE'|'TEAM_LEAD'|'DIRECTOR'|'SECURITY_REVIEW'|'CAB';
export interface ActionSemanticProfile { actionId:string; connectorDomain:ConnectorDomain; actionClass:string; capabilityClass:CapabilityClass; riskClass:RiskClass; reversibilityClass:ReversibilityClass; idempotencyClass:IdempotencyClass; requiredPermissions:string[]; requiredEvidence:string[]; preflightChecks:string[]; postflightChecks:string[]; rollbackPlan:string[]; sideEffectProfile:string[]; blockedWhen:string[]; manualOnlyWhen:string[]; approvalTier:ApprovalTier; proofRequirements:string[]; verificationRequirements:string[]; tenantIsolationRequirements:string[]; environmentRestrictions:string[]; }

export interface ProviderSemanticSignals {
  providerSemanticProfile: string[];
  propagationDelayRisk: 'LOW'|'MEDIUM'|'HIGH';
  reconciliationDelayRisk?: 'LOW'|'MEDIUM'|'HIGH';
  downstreamAuthImpact?: 'LOW'|'MEDIUM'|'HIGH';
  hybridIdentityRisk?: 'LOW'|'MEDIUM'|'HIGH';
  delegatedMailboxRisk?: 'LOW'|'MEDIUM'|'HIGH';
  syncConsistencyRisk?: 'LOW'|'MEDIUM'|'HIGH';
  queryConcurrencyImpact?: 'LOW'|'MEDIUM'|'HIGH';
  warehouseWarmupRisk?: 'LOW'|'MEDIUM'|'HIGH';
  workloadContentionRisk?: 'LOW'|'MEDIUM'|'HIGH';
  dashboardDependencyRisk?: 'LOW'|'MEDIUM'|'HIGH';
  concurrencyScalingImpact?: 'LOW'|'MEDIUM'|'HIGH';
  failSafeEconomicImpact?: 'LOW'|'MEDIUM'|'HIGH';
  dbuEconomicSensitivity?: 'LOW'|'MEDIUM'|'HIGH';
  runtimeVersionRisk?: 'LOW'|'MEDIUM'|'HIGH';
  unityCatalogDependencyRisk?: 'LOW'|'MEDIUM'|'HIGH';
  notebookDependencyRisk?: 'LOW'|'MEDIUM'|'HIGH';
  gpuRuntimeSensitivity?: 'LOW'|'MEDIUM'|'HIGH';
  autoscalingVolatilityRisk?: 'LOW'|'MEDIUM'|'HIGH';
  cmdbFreshnessRisk?: 'LOW'|'MEDIUM'|'HIGH';
  cabDelayRisk?: 'LOW'|'MEDIUM'|'HIGH';
  workflowMismatchRisk?: 'LOW'|'MEDIUM'|'HIGH';
  assignmentEscalationRisk?: 'LOW'|'MEDIUM'|'HIGH';
  orphanedCIRisk?: 'LOW'|'MEDIUM'|'HIGH';
  evidenceLineageRisk?: 'LOW'|'MEDIUM'|'HIGH';
  contractualAmbiguityRisk?: 'LOW'|'MEDIUM'|'HIGH';
  auditSensitivityRisk?: 'LOW'|'MEDIUM'|'HIGH';
  virtualizationAmbiguityRisk?: 'LOW'|'MEDIUM'|'HIGH';
  entitlementConfidenceRisk?: 'LOW'|'MEDIUM'|'HIGH';
  evidenceCompletenessRisk?: 'LOW'|'MEDIUM'|'HIGH';
  indirectAccessRisk?: 'LOW'|'MEDIUM'|'HIGH';
  autoscalingPropagationRisk?: 'LOW'|'MEDIUM'|'HIGH';
  sharedNetworkRisk?: 'LOW'|'MEDIUM'|'HIGH';
  iamDependencyRisk?: 'LOW'|'MEDIUM'|'HIGH';
  tagPropagationDelayRisk?: 'LOW'|'MEDIUM'|'HIGH';
  ephemeralLifecycleRisk?: 'LOW'|'MEDIUM'|'HIGH';
  environmentDriftRisk?: 'LOW'|'MEDIUM'|'HIGH';
}
