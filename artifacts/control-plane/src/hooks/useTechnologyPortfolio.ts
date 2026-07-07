import { useEffect, useMemo, useState } from 'react'
import { liveFetch } from '../lib/liveApi'
import { inferTechnologyManagementDecision, getProgram2EvidencePackCompleteness } from '../lib/program2TechnologyManagement'
import { useWorkspace } from '../lib/workspaceContext'
import type { TechnologyPortfolioSummary } from '../types/technologyPortfolio'

export const notAvailable = 'Not available'
export const emptyTechnologyPortfolioSummary: TechnologyPortfolioSummary = { assets: [], vendors: [], products: [], applications: [], risks: [], recommendations: [], duplicateCapabilities: [], renewals: [], values: [] }

const generatedAt = '2026-07-05T00:00:00.000Z'

export function demoTechnologyPortfolioSummary(): TechnologyPortfolioSummary {
  const assets = [
    { id: 'asset-m365-e5', name: 'Microsoft 365 E5', assetType: 'SAAS', capability: 'Productivity', vendorId: 'Microsoft', ownerUserId: 'Jane Owner', ownerStatus: 'ASSIGNED' as const, businessUnit: 'Corporate IT', costCentreId: 'IT-100', annualSpend: 850000, utilisation: 72, renewalDate: '2026-08-18', contractId: 'ctr-m365-2026', verifiedSavings: 96000, commercialExposure: 180000, completenessScore: 94, evidenceCompletenessStatus: 'COMPLETE' as const, managementDecision: 'RENEW' as const, decisionEvidence: ['usage:m365:e5-active', 'contract:m365:renewal', 'finance:m365:invoice'], lifecycleStatus: 'ACTIVE', currency: 'USD' },
    { id: 'asset-legacy-crm', name: 'Legacy CRM', assetType: 'APPLICATION', capability: 'CRM', vendorId: 'LegacyCo', ownerStatus: 'MISSING' as const, businessUnit: 'Revenue Operations', annualSpend: 400000, utilisation: 18, renewalDate: '2026-09-05', contractId: 'ctr-legacy-crm', commercialExposure: 400000, completenessScore: 48, evidenceCompletenessStatus: 'PARTIAL' as const, managementDecision: 'BLOCKED' as const, decisionEvidence: ['contract:legacy-crm:renewal', 'usage:legacy-crm:low'], lifecycleStatus: 'RETIRE_CANDIDATE', currency: 'USD' },
    { id: 'asset-slack', name: 'Slack Enterprise Grid', assetType: 'SAAS', capability: 'Collaboration', vendorId: 'Salesforce', ownerUserId: 'Collab Owner', ownerStatus: 'ASSIGNED' as const, businessUnit: 'Operations', costCentreId: 'OPS-210', annualSpend: 210000, utilisation: 64, renewalDate: '2026-11-12', contractId: 'ctr-slack', completenessScore: 88, evidenceCompletenessStatus: 'COMPLETE' as const, managementDecision: 'KEEP' as const, decisionEvidence: ['usage:slack:active', 'owner:slack:confirmed'], lifecycleStatus: 'ACTIVE', currency: 'USD' },
    { id: 'asset-teams-phone', name: 'Teams Phone', assetType: 'SAAS', capability: 'Collaboration', vendorId: 'Microsoft', ownerUserId: 'Collab Owner', ownerStatus: 'ASSIGNED' as const, businessUnit: 'Operations', costCentreId: 'OPS-210', annualSpend: 180000, utilisation: 31, renewalDate: '2026-08-18', contractId: 'ctr-m365-2026', completenessScore: 82, evidenceCompletenessStatus: 'COMPLETE' as const, managementDecision: 'CONSOLIDATE' as const, decisionEvidence: ['overlap:collaboration:slack-teams', 'usage:teams-phone:underused'], lifecycleStatus: 'OPTIMISE_CANDIDATE', currency: 'USD' },
    { id: 'asset-tableau', name: 'Tableau Creator', assetType: 'SAAS', capability: 'Analytics', vendorId: 'Salesforce', ownerUserId: 'Analytics Lead', ownerStatus: 'ASSIGNED' as const, businessUnit: 'Finance', costCentreId: 'FIN-300', annualSpend: 145000, utilisation: 27, renewalDate: '2026-10-02', contractId: 'ctr-tableau', completenessScore: 78, evidenceCompletenessStatus: 'PARTIAL' as const, managementDecision: 'OPTIMISE' as const, decisionEvidence: ['usage:tableau:underused', 'finance:tableau:spend'], lifecycleStatus: 'OPTIMISE_CANDIDATE', currency: 'USD' },
    { id: 'asset-shadow-ai', name: 'Unapproved AI Notes App', assetType: 'AI', capability: 'Productivity AI', vendorId: 'Unknown AI Vendor', ownerStatus: 'MISSING' as const, annualSpend: 72000, utilisation: 0, commercialExposure: 72000, completenessScore: 22, evidenceCompletenessStatus: 'PARTIAL' as const, managementDecision: 'REVIEW' as const, decisionEvidence: ['risk:shadow-ai:detected'], lifecycleStatus: 'UNDER_REVIEW', currency: 'USD' },
  ]
  return {
    snapshot: { id: 'demo-tech-mgmt-snapshot', tenantId: 'demo', generatedAt, assetCount: assets.length, vendorCount: 5, productCount: 6, applicationCount: 2, totalAnnualSpend: 1857000, totalFinanceVerifiedSavings: 96000, totalCommercialExposure: 652000, rationalisationOpportunity: 530000, annualisedSpendUnderReview: 617000, duplicateCapabilityCount: 1, highRiskUnmanagedAssetCount: 2, evidenceCompletenessRate: 67, currency: 'USD', missingOwnerCount: 2, missingCostCentreCount: 2, renewalRiskCount: 3, unverifiedSavingsCount: 4, averageConfidenceScore: 78, evidenceCoverageScore: 67, evidenceGapCount: 3, restrictedEvidenceCount: 2, readiness: 'DEMO' },
    assets,
    vendors: [{ id: 'microsoft', name: 'Microsoft' }, { id: 'salesforce', name: 'Salesforce' }, { id: 'legacyco', name: 'LegacyCo' }],
    products: [{ id: 'm365-e5', name: 'M365 E5' }, { id: 'slack-grid', name: 'Slack Enterprise Grid' }],
    applications: [{ id: 'legacy-crm', name: 'Legacy CRM' }, { id: 'shadow-ai', name: 'Unapproved AI Notes App' }],
    risks: [
      { id: 'risk-legacy-owner', targetId: 'asset-legacy-crm', riskType: 'MISSING_OWNER', severity: 'HIGH', description: 'Renewal inside 90 days with no accountable owner.', valueAtRisk: 400000, currency: 'USD' },
      { id: 'risk-shadow-ai', targetId: 'asset-shadow-ai', riskType: 'UNMANAGED_AI', severity: 'CRITICAL', description: 'Unmanaged AI application has no owner, cost centre, or approved business justification.', valueAtRisk: 72000, currency: 'USD' },
      { id: 'risk-collab-overlap', targetId: 'asset-teams-phone', riskType: 'DUPLICATE_CAPABILITY', severity: 'MEDIUM', description: 'Collaboration capability overlap with Slack creates rationalisation opportunity.', valueAtRisk: 180000, currency: 'USD' },
    ],
    recommendations: [
      { id: 'rec-legacy-crm', targetId: 'asset-legacy-crm', priority: 'HIGH', decision: 'BLOCKED', title: 'Block Legacy CRM renewal until owner and justification are restored', description: 'Missing owner and partial evidence prevent a confident renewal decision.', evidenceIds: ['contract:legacy-crm:renewal', 'usage:legacy-crm:low'], projectedValue: 400000, currency: 'USD', status: 'OPEN' },
      { id: 'rec-collab-overlap', targetId: 'asset-teams-phone', priority: 'MEDIUM', decision: 'CONSOLIDATE', title: 'Consolidate overlapping collaboration capability', description: 'Slack and Teams Phone overlap; low utilisation supports consolidation review.', evidenceIds: ['overlap:collaboration:slack-teams', 'usage:teams-phone:underused'], projectedValue: 180000, currency: 'USD', status: 'OPEN' },
      { id: 'rec-tableau', targetId: 'asset-tableau', priority: 'MEDIUM', decision: 'OPTIMISE', title: 'Optimise underused Tableau Creator licences', description: 'Usage is below management threshold while spend remains material.', evidenceIds: ['usage:tableau:underused', 'finance:tableau:spend'], projectedValue: 72000, currency: 'USD', status: 'OPEN' },
    ],
    duplicateCapabilities: [{ id: 'dup-collaboration', capability: 'Collaboration', assetIds: ['asset-slack', 'asset-teams-phone'], overlapReason: 'Two enterprise collaboration stacks serve the same user population.', annualSpend: 390000, recommendedDecision: 'CONSOLIDATE', evidenceIds: ['overlap:collaboration:slack-teams'] }],
    renewals: [
      { id: 'renew-m365', assetId: 'asset-m365-e5', vendor: 'Microsoft', renewalDate: '2026-08-18', annualSpend: 850000, renewalRisk: 'MEDIUM', recommendedDecision: 'RENEW', evidenceIds: ['contract:m365:renewal', 'usage:m365:e5-active'] },
      { id: 'renew-legacy-crm', assetId: 'asset-legacy-crm', vendor: 'LegacyCo', renewalDate: '2026-09-05', annualSpend: 400000, renewalRisk: 'HIGH', recommendedDecision: 'BLOCKED', evidenceIds: ['contract:legacy-crm:renewal'] },
      { id: 'renew-tableau', assetId: 'asset-tableau', vendor: 'Salesforce', renewalDate: '2026-10-02', annualSpend: 145000, renewalRisk: 'MEDIUM', recommendedDecision: 'OPTIMISE', evidenceIds: ['contract:tableau:renewal', 'usage:tableau:underused'] },
    ],
    values: [{ id: 'value-m365', financeVerifiedValue: 96000 }],
    proofPackReadiness: { boardPackStatus: 'PARTIAL', cfoPackStatus: 'PARTIAL', auditPackStatus: 'PARTIAL', evidenceExportSafety: 'REDACTION_REQUIRED' },
    executionReadiness: { planStatus: 'MANAGEMENT_REVIEW_REQUIRED', dryRunStatus: 'NOT_APPLICABLE', blockedExecutionCount: 2, readyExecutionCount: 2 },
  }
}

export function summarizeTechnologyManagementKpis(summary: TechnologyPortfolioSummary) {
  const snap = summary.snapshot
  return {
    totalGovernedAssets: snap?.assetCount ?? 0,
    assetsMissingOwner: snap?.missingOwnerCount ?? 0,
    renewalsInside90Days: snap?.renewalRiskCount ?? 0,
    duplicateCapabilitiesDetected: snap?.duplicateCapabilityCount ?? 0,
    annualisedSpendUnderReview: snap?.annualisedSpendUnderReview ?? 0,
    rationalisationOpportunity: snap?.rationalisationOpportunity ?? 0,
    highRiskUnmanagedAssets: snap?.highRiskUnmanagedAssetCount ?? 0,
    evidenceCompletenessRate: snap?.evidenceCompletenessRate,
  }
}

export function buildTechnologyManagementEvidencePack(asset: TechnologyPortfolioSummary['assets'][number], summary: TechnologyPortfolioSummary) {
  const risk = summary.risks.find((item) => item.targetId === asset.id)
  const renewal = summary.renewals?.find((item) => item.assetId === asset.id)
  const duplicate = summary.duplicateCapabilities?.find((item) => item.assetIds.includes(asset.id))
  const decision = inferTechnologyManagementDecision(asset, risk?.severity === 'HIGH' || risk?.severity === 'CRITICAL')
  return getProgram2EvidencePackCompleteness({
    assetSourceSystem: `${asset.vendorId ?? 'Unknown source'}:${asset.name}`,
    ownerOrOwnerStatus: asset.ownerUserId ?? asset.ownerStatus,
    businessUnitOrCostCentre: asset.businessUnit ?? asset.costCentreId,
    contractOrRenewalBasis: renewal?.renewalDate ?? asset.contractId,
    spendOrValueBasis: asset.annualSpend,
    usageOrUtilisationBasis: asset.utilisation,
    riskOrOverlapReason: risk?.description ?? duplicate?.overlapReason,
    recommendedManagementDecision: decision,
    verificationStatus: asset.evidenceCompletenessStatus,
    confidence: asset.completenessScore,
    timestampOrLineage: summary.snapshot?.generatedAt,
    outcomeOrProtectionState: asset.lifecycleStatus,
    renewalApplicable: Boolean(renewal || asset.renewalDate || asset.contractId),
    usageApplicable: asset.utilisation !== undefined,
    riskOrOverlapApplicable: Boolean(risk || duplicate),
    outcomeApplicable: Boolean(asset.lifecycleStatus),
  })
}

export function useTechnologyPortfolio() {
  const workspace = useWorkspace()
  const [summary, setSummary] = useState<TechnologyPortfolioSummary>(() => workspace.mode === 'demo' ? demoTechnologyPortfolioSummary() : emptyTechnologyPortfolioSummary)
  const [loading, setLoading] = useState(workspace.mode === 'live' && workspace.dataReady)

  useEffect(() => {
    let cancel = false
    if (workspace.mode === 'demo') { setSummary(demoTechnologyPortfolioSummary()); setLoading(false); return undefined }
    if (!workspace.dataReady) { setSummary(emptyTechnologyPortfolioSummary); setLoading(false); return undefined }
    setLoading(true)
    liveFetch<TechnologyPortfolioSummary>('/api/technology-portfolio/summary')
      .then((data) => { if (!cancel) setSummary(data?.snapshot || data?.assets ? { ...emptyTechnologyPortfolioSummary, ...data } : emptyTechnologyPortfolioSummary) })
      .catch(() => { if (!cancel) setSummary(emptyTechnologyPortfolioSummary) })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [workspace.mode, workspace.dataReady])

  return useMemo(() => ({ summary, loading, isDemo: workspace.mode === 'demo', isLiveUnconnected: workspace.mode === 'live' && !workspace.dataReady }), [summary, loading, workspace.mode, workspace.dataReady])
}
