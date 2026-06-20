import type { ConnectorHealthReport, EvidenceExportReadiness, LiveTenantReadinessData, TenantRuntimeMode } from '../../hooks/useLiveTenantReadinessData'

const now = '2026-06-11T00:00:00Z'

export function liveTenantReadinessDemoSeed(): Omit<LiveTenantReadinessData, 'loading' | 'error' | 'refreshConnectorHealth' | 'updateTenantExecutionPolicy'> {
  const connectorHealth: ConnectorHealthReport[] = [
    { tenantId: 'demo-tenant', connectorId: 'm365-prod', connectorType: 'M365', status: 'HEALTHY', credentialExpiresAt: '2026-07-01T00:00:00Z', scopes: ['User.Read.All', 'Directory.Read.All'], missingScopes: [], lastCheckedAt: now, errors: [] },
    { tenantId: 'demo-tenant', connectorId: 'azure-prod', connectorType: 'AZURE', status: 'HEALTHY', credentialExpiresAt: '2026-07-12T00:00:00Z', scopes: ['Microsoft.Compute/virtualMachines/read', 'CostManagement.Read'], missingScopes: [], lastCheckedAt: now, errors: [] },
    { tenantId: 'demo-tenant', connectorId: 'aws-prod', connectorType: 'AWS', status: 'HEALTHY', credentialExpiresAt: '2026-07-10T00:00:00Z', scopes: ['ec2:DescribeInstances', 'ce:GetCostAndUsage'], missingScopes: [], lastCheckedAt: now, errors: [] },
    { tenantId: 'demo-tenant', connectorId: 'servicenow-prod', connectorType: 'SERVICENOW', status: 'DEGRADED', credentialExpiresAt: '2026-06-20T00:00:00Z', scopes: ['change.write'], missingScopes: ['approval.write'], rateLimitResetAt: '2026-06-11T01:00:00Z', lastCheckedAt: now, errors: ['ServiceNow approval scope missing'] },
  ]
  const evidenceExportReadiness: EvidenceExportReadiness[] = [
    { tenantId: 'demo-tenant', actionId: 'copilot-reclaim-001', wedge: 'M365', ready: false, missing: 'VERIFICATION_EVIDENCE', missingItems: ['VERIFICATION_EVIDENCE'], generatedAt: now },
    { tenantId: 'demo-tenant', actionId: 'ai-owner-002', wedge: 'AI', ready: true, missing: null, missingItems: [], generatedAt: now },
    { tenantId: 'demo-tenant', actionId: 'azure-rightsize-005', wedge: 'AZURE', ready: true, missing: null, missingItems: [], generatedAt: now },
    { tenantId: 'demo-tenant', actionId: 'aws-rightsize-004', wedge: 'AWS', ready: true, missing: null, missingItems: [], generatedAt: now },
    { tenantId: 'demo-tenant', actionId: 'snow-change-003', wedge: 'SERVICENOW', ready: true, missing: null, missingItems: [], generatedAt: now },
  ]
  return {
    readiness: { tenantId: 'demo-tenant', mode: 'PILOT_CONTROLLED_EXECUTION' as TenantRuntimeMode, certifiedWedges: { m365: true, ai: true, servicenow: true, aws: true, azure: true }, connectorHealth, executionGateSummary: { allowed: 7, blocked: 2, dryRunOnly: 1 }, auditCompleteness: { complete: 5, incomplete: 1 }, evidenceExportReadiness: { ready: 2, blocked: 1 }, blockers: ['Production mode blocked until ServiceNow connector health is healthy', 'Audit incomplete for Copilot reclaim action', 'Evidence export blocked: missing verification evidence'], readyForPilot: true, readyForProduction: false },
    tenantExecutionPolicy: { tenantId: 'demo-tenant', mode: 'PILOT_CONTROLLED_EXECUTION' as TenantRuntimeMode, allowRealWrites: true, allowDryRun: true, requireApprovalAuthority: true, requireTrustAuthority: true, requireEvidence: true, requireRollbackForDestructive: true, maxBlastRadiusAllowed: 'MEDIUM', allowedDomains: ['M365', 'AI', 'SERVICENOW', 'AWS', 'AZURE'], createdAt: now, updatedAt: now },
    connectorHealth,
    evidenceExportReadiness,
    isDemo: true,
  }
}
