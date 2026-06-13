import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PortfolioAssetType =
  | 'APPLICATION' | 'SAAS' | 'M365' | 'AI_ASSET' | 'AWS_RESOURCE' | 'AZURE_RESOURCE'
  | 'SNOWFLAKE_WAREHOUSE' | 'DATABRICKS_CLUSTER' | 'SERVICENOW_ARTIFACT' | 'ITAM_ASSET'
  | 'CONTRACT' | 'HARDWARE' | 'OTHER'

export type PortfolioSourceWedge = 'M365' | 'AI' | 'SERVICENOW' | 'SNOWFLAKE' | 'DATABRICKS' | 'AWS' | 'AZURE' | 'ITAM' | 'MANUAL' | 'OTHER'

export type PortfolioAsset = {
  id: string
  tenantId: string
  name: string
  assetType: PortfolioAssetType
  sourceWedge: PortfolioSourceWedge
  sourceId: string
  sourceSystem?: string
  vendor?: string
  product?: string
  environment?: 'PRODUCTION' | 'NON_PRODUCTION' | 'DEVELOPMENT' | 'UNKNOWN'
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'OPTIMISING' | 'RETIRED' | 'PROTECTED' | 'DRIFTED' | 'UNKNOWN'
  ownerId?: string
  ownerName?: string
  businessUnit?: string
  costCentre?: string
  monthlyCost?: number
  annualCost?: number
  monthlyValue?: number
  annualValue?: number
  protectedMonthlyValue?: number
  protectedAnnualValue?: number
  utilisationScore?: number
  riskScore?: number
  governanceScore?: number
  trustScore?: number
  renewalDate?: string
  contractId?: string
  recommendationIds: string[]
  governedActionIds: string[]
  outcomeIds: string[]
  protectedOutcomeIds: string[]
  evidenceIds: string[]
  certificationStatus: 'CERTIFIED' | 'NOT_CERTIFIED' | 'PARTIAL' | 'UNKNOWN'
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type PortfolioOwner = {
  id: string
  tenantId: string
  name: string
  email?: string
  role?: string
  businessUnit?: string
  costCentre?: string
  assetIds: string[]
  actionIds: string[]
  outcomeIds: string[]
  createdAt: string
  updatedAt: string
}

export type PortfolioContract = {
  id: string
  tenantId: string
  vendor: string
  contractName: string
  renewalDate?: string
  annualValue?: number
  ownerId?: string
  linkedAssetIds: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'
  status: 'ACTIVE' | 'RENEWAL_DUE' | 'UNDER_REVIEW' | 'RETIRED' | 'UNKNOWN'
  createdAt: string
  updatedAt: string
}

export type PortfolioRenewal = {
  id: string
  tenantId: string
  contractId: string
  renewalDate: string
  daysUntilRenewal: number
  renewalRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  projectedSavings?: number
  linkedRecommendationIds: string[]
  linkedActionIds: string[]
  createdAt: string
  updatedAt: string
}

export type DomainBreakdownRow = {
  sourceWedge: string
  assetCount: number
  monthlyCost: number
  annualCost: number
  protectedAnnualValue: number
  highRiskAssets: number
  certifiedAssets: number
}

export type TechnologyPortfolioHealth = {
  tenantId: string
  totalAssets: number
  activeAssets: number
  retiredAssets: number
  certifiedAssets: number
  uncertifiedAssets: number
  totalMonthlyCost: number
  totalAnnualCost: number
  totalMonthlyValue: number
  totalAnnualValue: number
  protectedMonthlyValue: number
  protectedAnnualValue: number
  ownerCoveragePercent: number
  costCentreCoveragePercent: number
  utilisationCoveragePercent: number
  certificationCoveragePercent: number
  governanceCoveragePercent: number
  highRiskAssets: number
  driftedAssets: number
  renewalRiskAssets: number
  optimisationOpportunities: number
  topRiskAssets: PortfolioAsset[]
  topValueAssets: PortfolioAsset[]
  upcomingRenewals: PortfolioRenewal[]
  domainBreakdown: DomainBreakdownRow[]
  blockers: string[]
}

export type TechnologyPortfolioAuthorityData = {
  health: TechnologyPortfolioHealth
  assets: PortfolioAsset[]
  owners: PortfolioOwner[]
  contracts: PortfolioContract[]
  renewals: PortfolioRenewal[]
  isDemo: boolean
  loading: boolean
  error: string | null
}

// ─── API Paths ─────────────────────────────────────────────────────────────────

export const technologyPortfolioAuthorityApiPaths = [
  '/api/technology-portfolio/health',
  '/api/technology-portfolio/assets',
  '/api/technology-portfolio/owners',
  '/api/technology-portfolio/contracts',
  '/api/technology-portfolio/renewals',
] as const

// ─── Demo Fallback ─────────────────────────────────────────────────────────────

function demoAsset(overrides: Partial<PortfolioAsset> & Pick<PortfolioAsset, 'id' | 'name' | 'assetType' | 'sourceWedge' | 'sourceId'>): PortfolioAsset {
  const now = new Date().toISOString()
  return {
    tenantId: 'demo',
    status: 'ACTIVE',
    environment: 'PRODUCTION',
    certificationStatus: 'CERTIFIED',
    recommendationIds: [],
    governedActionIds: [],
    outcomeIds: [],
    protectedOutcomeIds: [],
    evidenceIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const demoAssets: PortfolioAsset[] = [
  demoAsset({ id: 'pa-m365-1', name: 'Microsoft 365 E3 Licences', assetType: 'M365', sourceWedge: 'M365', sourceId: 'm365-e3', vendor: 'Microsoft', product: 'Microsoft 365 E3', ownerName: 'IT Operations', businessUnit: 'Corporate IT', costCentre: 'CC-IT-001', monthlyCost: 18500, annualCost: 222000, annualValue: 264000, protectedAnnualValue: 96000, utilisationScore: 68, riskScore: 15, governanceScore: 80 }),
  demoAsset({ id: 'pa-m365-2', name: 'Microsoft 365 F1 Licences', assetType: 'M365', sourceWedge: 'M365', sourceId: 'm365-f1', vendor: 'Microsoft', product: 'Microsoft 365 F1', ownerName: 'IT Operations', businessUnit: 'Corporate IT', costCentre: 'CC-IT-001', monthlyCost: 4200, annualCost: 50400, annualValue: 60000, utilisationScore: 42, riskScore: 30, status: 'UNDER_REVIEW', certificationStatus: 'PARTIAL' }),
  demoAsset({ id: 'pa-ai-1', name: 'AI Economic Control Engine', assetType: 'AI_ASSET', sourceWedge: 'AI', sourceId: 'ai-engine', vendor: 'Certen', ownerName: 'AI Platform Team', businessUnit: 'Engineering', costCentre: 'CC-ENG-002', monthlyCost: 12000, annualCost: 144000, annualValue: 216000, protectedAnnualValue: 120000, utilisationScore: 85, riskScore: 10, governanceScore: 90 }),
  demoAsset({ id: 'pa-sn-1', name: 'ServiceNow ITSM Platform', assetType: 'SERVICENOW_ARTIFACT', sourceWedge: 'SERVICENOW', sourceId: 'sn-itsm', vendor: 'ServiceNow', ownerName: 'Service Management', businessUnit: 'IT Operations', costCentre: 'CC-OPS-003', monthlyCost: 25000, annualCost: 300000, annualValue: 360000, protectedAnnualValue: 144000, utilisationScore: 80, riskScore: 20, renewalDate: new Date(Date.now() + 75 * 86400000).toISOString().split('T')[0] }),
  demoAsset({ id: 'pa-aws-1', name: 'AWS EC2 Fleet', assetType: 'AWS_RESOURCE', sourceWedge: 'AWS', sourceId: 'aws-ec2', vendor: 'Amazon', product: 'EC2', ownerName: 'Cloud Engineering', businessUnit: 'Infrastructure', costCentre: 'CC-INFRA-004', monthlyCost: 45000, annualCost: 540000, annualValue: 624000, protectedAnnualValue: 240000, utilisationScore: 55, riskScore: 25, governanceScore: 78 }),
  demoAsset({ id: 'pa-aws-2', name: 'AWS RDS Databases', assetType: 'AWS_RESOURCE', sourceWedge: 'AWS', sourceId: 'aws-rds', vendor: 'Amazon', product: 'RDS', ownerName: 'Data Engineering', businessUnit: 'Data Platform', costCentre: 'CC-DATA-005', monthlyCost: 18000, annualCost: 216000, annualValue: 252000, protectedAnnualValue: 96000, utilisationScore: 72, riskScore: 18 }),
  demoAsset({ id: 'pa-az-1', name: 'Azure Virtual Machines', assetType: 'AZURE_RESOURCE', sourceWedge: 'AZURE', sourceId: 'az-vms', vendor: 'Microsoft', product: 'Azure VMs', ownerName: 'Cloud Engineering', businessUnit: 'Infrastructure', costCentre: 'CC-INFRA-004', monthlyCost: 32000, annualCost: 384000, annualValue: 456000, protectedAnnualValue: 180000, utilisationScore: 60, riskScore: 22 }),
  demoAsset({ id: 'pa-sf-1', name: 'Snowflake Production Warehouse', assetType: 'SNOWFLAKE_WAREHOUSE', sourceWedge: 'SNOWFLAKE', sourceId: 'sf-prod', vendor: 'Snowflake', ownerName: 'Data Platform Team', businessUnit: 'Data Platform', costCentre: 'CC-DATA-005', monthlyCost: 28000, annualCost: 336000, annualValue: 408000, protectedAnnualValue: 168000, utilisationScore: 65, riskScore: 20, renewalDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0] }),
  demoAsset({ id: 'pa-db-1', name: 'Databricks ML Cluster', assetType: 'DATABRICKS_CLUSTER', sourceWedge: 'DATABRICKS', sourceId: 'db-ml', vendor: 'Databricks', ownerName: 'Data Science Team', businessUnit: 'Data Platform', costCentre: 'CC-DATA-005', monthlyCost: 22000, annualCost: 264000, annualValue: 312000, protectedAnnualValue: 120000, utilisationScore: 58, riskScore: 28 }),
  demoAsset({ id: 'pa-itam-1', name: 'Flexera One Platform', assetType: 'ITAM_ASSET', sourceWedge: 'ITAM', sourceId: 'flexera-one', vendor: 'Flexera', product: 'Flexera One', ownerName: 'IT Asset Management', businessUnit: 'Corporate IT', costCentre: 'CC-IT-001', monthlyCost: 8000, annualCost: 96000, annualValue: 120000, protectedAnnualValue: 48000, utilisationScore: 70, riskScore: 15, renewalDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0] }),
  demoAsset({ id: 'pa-itam-2', name: 'Adobe Creative Cloud Licences', assetType: 'ITAM_ASSET', sourceWedge: 'ITAM', sourceId: 'adobe-cc', vendor: 'Adobe', product: 'Creative Cloud', businessUnit: 'Marketing', monthlyCost: 5500, annualCost: 66000, annualValue: 72000, utilisationScore: 35, riskScore: 45, status: 'UNDER_REVIEW', certificationStatus: 'PARTIAL' }),
]

const demoOwners: PortfolioOwner[] = [
  { id: 'own-1', tenantId: 'demo', name: 'IT Operations', email: 'it-ops@example.com', businessUnit: 'Corporate IT', costCentre: 'CC-IT-001', assetIds: ['pa-m365-1', 'pa-m365-2'], actionIds: [], outcomeIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'own-2', tenantId: 'demo', name: 'Cloud Engineering', email: 'cloud@example.com', businessUnit: 'Infrastructure', costCentre: 'CC-INFRA-004', assetIds: ['pa-aws-1', 'pa-az-1'], actionIds: [], outcomeIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'own-3', tenantId: 'demo', name: 'Data Platform Team', email: 'data@example.com', businessUnit: 'Data Platform', costCentre: 'CC-DATA-005', assetIds: ['pa-sf-1', 'pa-db-1'], actionIds: [], outcomeIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

const demoContracts: PortfolioContract[] = [
  { id: 'con-1', tenantId: 'demo', vendor: 'ServiceNow', contractName: 'ServiceNow Enterprise Agreement', renewalDate: new Date(Date.now() + 75 * 86400000).toISOString().split('T')[0], annualValue: 300000, linkedAssetIds: ['pa-sn-1'], riskLevel: 'MEDIUM', status: 'RENEWAL_DUE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'con-2', tenantId: 'demo', vendor: 'Snowflake', contractName: 'Snowflake Capacity Contract', renewalDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0], annualValue: 336000, linkedAssetIds: ['pa-sf-1'], riskLevel: 'HIGH', status: 'RENEWAL_DUE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'con-3', tenantId: 'demo', vendor: 'Flexera', contractName: 'Flexera One SaaS Contract', renewalDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0], annualValue: 96000, linkedAssetIds: ['pa-itam-1'], riskLevel: 'HIGH', status: 'RENEWAL_DUE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

const demoRenewals: PortfolioRenewal[] = [
  { id: 'ren-1', tenantId: 'demo', contractId: 'con-2', renewalDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0], daysUntilRenewal: 45, renewalRisk: 'HIGH', projectedSavings: 42000, linkedRecommendationIds: [], linkedActionIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'ren-2', tenantId: 'demo', contractId: 'con-3', renewalDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0], daysUntilRenewal: 60, renewalRisk: 'HIGH', projectedSavings: 18000, linkedRecommendationIds: [], linkedActionIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'ren-3', tenantId: 'demo', contractId: 'con-1', renewalDate: new Date(Date.now() + 75 * 86400000).toISOString().split('T')[0], daysUntilRenewal: 75, renewalRisk: 'MEDIUM', projectedSavings: 35000, linkedRecommendationIds: [], linkedActionIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

const demoHealth: TechnologyPortfolioHealth = {
  tenantId: 'demo',
  totalAssets: demoAssets.length,
  activeAssets: demoAssets.filter((a) => a.status === 'ACTIVE').length,
  retiredAssets: 0,
  certifiedAssets: demoAssets.filter((a) => a.certificationStatus === 'CERTIFIED').length,
  uncertifiedAssets: demoAssets.filter((a) => a.certificationStatus === 'NOT_CERTIFIED').length,
  totalMonthlyCost: demoAssets.reduce((s, a) => s + (a.monthlyCost ?? 0), 0),
  totalAnnualCost: demoAssets.reduce((s, a) => s + (a.annualCost ?? 0), 0),
  totalMonthlyValue: demoAssets.reduce((s, a) => s + (a.monthlyValue ?? 0), 0),
  totalAnnualValue: demoAssets.reduce((s, a) => s + (a.annualValue ?? 0), 0),
  protectedMonthlyValue: 0,
  protectedAnnualValue: demoAssets.reduce((s, a) => s + (a.protectedAnnualValue ?? 0), 0),
  ownerCoveragePercent: 82,
  costCentreCoveragePercent: 73,
  utilisationCoveragePercent: 100,
  certificationCoveragePercent: 73,
  governanceCoveragePercent: 82,
  highRiskAssets: 2,
  driftedAssets: 0,
  renewalRiskAssets: 3,
  optimisationOpportunities: 3,
  topRiskAssets: demoAssets.slice().sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).slice(0, 5),
  topValueAssets: demoAssets.slice().sort((a, b) => (b.annualValue ?? 0) - (a.annualValue ?? 0)).slice(0, 5),
  upcomingRenewals: demoRenewals,
  domainBreakdown: (['M365', 'AI', 'SERVICENOW', 'AWS', 'AZURE', 'SNOWFLAKE', 'DATABRICKS', 'ITAM'] as const).map((w) => {
    const wa = demoAssets.filter((a) => a.sourceWedge === w)
    return { sourceWedge: w, assetCount: wa.length, monthlyCost: wa.reduce((s, a) => s + (a.monthlyCost ?? 0), 0), annualCost: wa.reduce((s, a) => s + (a.annualCost ?? 0), 0), protectedAnnualValue: wa.reduce((s, a) => s + (a.protectedAnnualValue ?? 0), 0), highRiskAssets: wa.filter((a) => (a.riskScore ?? 0) >= 40).length, certifiedAssets: wa.filter((a) => a.certificationStatus === 'CERTIFIED').length }
  }),
  blockers: ['3 renewal(s) due within 90 days', '2 asset(s) missing owner assignment'],
}

export const demoTechnologyPortfolioAuthority = {
  health: demoHealth,
  assets: demoAssets,
  owners: demoOwners,
  contracts: demoContracts,
  renewals: demoRenewals,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTechnologyPortfolioAuthorityData(): TechnologyPortfolioAuthorityData {
  const [state, setState] = useState<TechnologyPortfolioAuthorityData>({
    health: demoHealth,
    assets: demoAssets,
    owners: demoOwners,
    contracts: demoContracts,
    renewals: demoRenewals,
    isDemo: true,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [healthRes, assetsRes, ownersRes, contractsRes, renewalsRes] = await Promise.all([
          fetch('/api/technology-portfolio/health'),
          fetch('/api/technology-portfolio/assets'),
          fetch('/api/technology-portfolio/owners'),
          fetch('/api/technology-portfolio/contracts'),
          fetch('/api/technology-portfolio/renewals'),
        ])
        if (!healthRes.ok || !assetsRes.ok) throw new Error('Portfolio APIs unavailable')
        const [health, assets, owners, contracts, renewals] = await Promise.all([
          healthRes.json() as Promise<TechnologyPortfolioHealth>,
          assetsRes.json() as Promise<PortfolioAsset[]>,
          ownersRes.json() as Promise<PortfolioOwner[]>,
          contractsRes.json() as Promise<PortfolioContract[]>,
          renewalsRes.json() as Promise<PortfolioRenewal[]>,
        ])
        if (!cancelled) setState({ health, assets, owners, contracts, renewals, isDemo: false, loading: false, error: null })
      } catch (err) {
        if (!cancelled) setState((prev) => ({ ...prev, isDemo: true, loading: false, error: String(err) }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return state
}
