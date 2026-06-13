import { randomUUID } from "crypto";
import { getCertifiedWedgeRegistry } from "../certification/certified-wedge-registry";
import { listItamAssets } from "../connectors/itam/itam-assets";

// ─── Core Types ──────────────────────────────────────────────────────────────

export type PortfolioAssetType =
  | "APPLICATION"
  | "SAAS"
  | "M365"
  | "AI_ASSET"
  | "AWS_RESOURCE"
  | "AZURE_RESOURCE"
  | "SNOWFLAKE_WAREHOUSE"
  | "DATABRICKS_CLUSTER"
  | "SERVICENOW_ARTIFACT"
  | "ITAM_ASSET"
  | "CONTRACT"
  | "HARDWARE"
  | "OTHER";

export type PortfolioAsset = {
  id: string;
  tenantId: string;
  name: string;
  assetType: PortfolioAssetType;
  sourceWedge: "M365" | "AI" | "SERVICENOW" | "SNOWFLAKE" | "DATABRICKS" | "AWS" | "AZURE" | "ITAM" | "MANUAL" | "OTHER";
  sourceId: string;
  sourceSystem?: string;
  vendor?: string;
  product?: string;
  environment?: "PRODUCTION" | "NON_PRODUCTION" | "DEVELOPMENT" | "UNKNOWN";
  status: "ACTIVE" | "UNDER_REVIEW" | "OPTIMISING" | "RETIRED" | "PROTECTED" | "DRIFTED" | "UNKNOWN";
  ownerId?: string;
  ownerName?: string;
  businessUnit?: string;
  costCentre?: string;
  monthlyCost?: number;
  annualCost?: number;
  monthlyValue?: number;
  annualValue?: number;
  protectedMonthlyValue?: number;
  protectedAnnualValue?: number;
  utilisationScore?: number;
  riskScore?: number;
  governanceScore?: number;
  trustScore?: number;
  renewalDate?: string;
  contractId?: string;
  recommendationIds: string[];
  governedActionIds: string[];
  outcomeIds: string[];
  protectedOutcomeIds: string[];
  evidenceIds: string[];
  certificationStatus: "CERTIFIED" | "NOT_CERTIFIED" | "PARTIAL" | "UNKNOWN";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioOwner = {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  role?: string;
  businessUnit?: string;
  costCentre?: string;
  assetIds: string[];
  actionIds: string[];
  outcomeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PortfolioContract = {
  id: string;
  tenantId: string;
  vendor: string;
  contractName: string;
  renewalDate?: string;
  annualValue?: number;
  ownerId?: string;
  linkedAssetIds: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
  status: "ACTIVE" | "RENEWAL_DUE" | "UNDER_REVIEW" | "RETIRED" | "UNKNOWN";
  createdAt: string;
  updatedAt: string;
};

export type PortfolioRenewal = {
  id: string;
  tenantId: string;
  contractId: string;
  renewalDate: string;
  daysUntilRenewal: number;
  renewalRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  projectedSavings?: number;
  linkedRecommendationIds: string[];
  linkedActionIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type TechnologyPortfolioHealth = {
  tenantId: string;
  totalAssets: number;
  activeAssets: number;
  retiredAssets: number;
  certifiedAssets: number;
  uncertifiedAssets: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  totalMonthlyValue: number;
  totalAnnualValue: number;
  protectedMonthlyValue: number;
  protectedAnnualValue: number;
  ownerCoveragePercent: number;
  costCentreCoveragePercent: number;
  utilisationCoveragePercent: number;
  certificationCoveragePercent: number;
  governanceCoveragePercent: number;
  highRiskAssets: number;
  driftedAssets: number;
  renewalRiskAssets: number;
  optimisationOpportunities: number;
  topRiskAssets: PortfolioAsset[];
  topValueAssets: PortfolioAsset[];
  upcomingRenewals: PortfolioRenewal[];
  domainBreakdown: Array<{
    sourceWedge: string;
    assetCount: number;
    monthlyCost: number;
    annualCost: number;
    protectedAnnualValue: number;
    highRiskAssets: number;
    certifiedAssets: number;
  }>;
  blockers: string[];
};

// ─── In-Memory Stores ─────────────────────────────────────────────────────────

const assetStore = new Map<string, PortfolioAsset>();
const ownerStore = new Map<string, PortfolioOwner>();
const contractStore = new Map<string, PortfolioContract>();
const renewalStore = new Map<string, PortfolioRenewal>();

function assetKey(tenantId: string, id: string) { return `${tenantId}:${id}`; }
function ownerKey(tenantId: string, id: string) { return `${tenantId}:${id}`; }
function contractKey(tenantId: string, id: string) { return `${tenantId}:${id}`; }
function renewalKey(tenantId: string, id: string) { return `${tenantId}:${id}`; }

// ─── Asset CRUD ───────────────────────────────────────────────────────────────

export function createPortfolioAsset(data: Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">): PortfolioAsset {
  const now = new Date().toISOString();
  const asset: PortfolioAsset = { id: randomUUID(), createdAt: now, updatedAt: now, ...data };
  assetStore.set(assetKey(asset.tenantId, asset.id), asset);
  return asset;
}

export function getPortfolioAsset(tenantId: string, id: string): PortfolioAsset | undefined {
  return assetStore.get(assetKey(tenantId, id));
}

export function listPortfolioAssets(tenantId: string): PortfolioAsset[] {
  return [...assetStore.values()].filter((a) => a.tenantId === tenantId);
}

export function updatePortfolioAsset(tenantId: string, id: string, patch: Partial<PortfolioAsset>): PortfolioAsset | undefined {
  const existing = assetStore.get(assetKey(tenantId, id));
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, tenantId, id, updatedAt: new Date().toISOString() };
  assetStore.set(assetKey(tenantId, id), updated);
  return updated;
}

// ─── Owner CRUD ───────────────────────────────────────────────────────────────

export function createPortfolioOwner(data: Omit<PortfolioOwner, "id" | "createdAt" | "updatedAt">): PortfolioOwner {
  const now = new Date().toISOString();
  const owner: PortfolioOwner = { id: randomUUID(), createdAt: now, updatedAt: now, ...data };
  ownerStore.set(ownerKey(owner.tenantId, owner.id), owner);
  return owner;
}

export function listPortfolioOwners(tenantId: string): PortfolioOwner[] {
  return [...ownerStore.values()].filter((o) => o.tenantId === tenantId);
}

// ─── Contract CRUD ────────────────────────────────────────────────────────────

export function createPortfolioContract(data: Omit<PortfolioContract, "id" | "createdAt" | "updatedAt">): PortfolioContract {
  const now = new Date().toISOString();
  const contract: PortfolioContract = { id: randomUUID(), createdAt: now, updatedAt: now, ...data };
  contractStore.set(contractKey(contract.tenantId, contract.id), contract);
  return contract;
}

export function listPortfolioContracts(tenantId: string): PortfolioContract[] {
  return [...contractStore.values()].filter((c) => c.tenantId === tenantId);
}

// ─── Renewal CRUD ─────────────────────────────────────────────────────────────

export function createPortfolioRenewal(data: Omit<PortfolioRenewal, "id" | "createdAt" | "updatedAt">): PortfolioRenewal {
  const now = new Date().toISOString();
  const renewal: PortfolioRenewal = { id: randomUUID(), createdAt: now, updatedAt: now, ...data };
  renewalStore.set(renewalKey(renewal.tenantId, renewal.id), renewal);
  return renewal;
}

export function listPortfolioRenewals(tenantId: string): PortfolioRenewal[] {
  return [...renewalStore.values()].filter((r) => r.tenantId === tenantId);
}

// ─── Relationship Linking ─────────────────────────────────────────────────────

export function linkPortfolioAssetToRecommendation(tenantId: string, assetId: string, recommendationId: string): void {
  const asset = getPortfolioAsset(tenantId, assetId);
  if (!asset) return;
  if (!asset.recommendationIds.includes(recommendationId)) {
    updatePortfolioAsset(tenantId, assetId, { recommendationIds: [...asset.recommendationIds, recommendationId] });
  }
}

export function linkPortfolioAssetToGovernedAction(tenantId: string, assetId: string, actionId: string): void {
  const asset = getPortfolioAsset(tenantId, assetId);
  if (!asset) return;
  if (!asset.governedActionIds.includes(actionId)) {
    updatePortfolioAsset(tenantId, assetId, { governedActionIds: [...asset.governedActionIds, actionId] });
  }
}

export function linkPortfolioAssetToOutcome(tenantId: string, assetId: string, outcomeId: string): void {
  const asset = getPortfolioAsset(tenantId, assetId);
  if (!asset) return;
  if (!asset.outcomeIds.includes(outcomeId)) {
    updatePortfolioAsset(tenantId, assetId, { outcomeIds: [...asset.outcomeIds, outcomeId] });
  }
}

export function linkPortfolioAssetToProtectedOutcome(tenantId: string, assetId: string, protectedOutcomeId: string): void {
  const asset = getPortfolioAsset(tenantId, assetId);
  if (!asset) return;
  if (!asset.protectedOutcomeIds.includes(protectedOutcomeId)) {
    updatePortfolioAsset(tenantId, assetId, { protectedOutcomeIds: [...asset.protectedOutcomeIds, protectedOutcomeId] });
  }
}

export function linkPortfolioAssetToEvidence(tenantId: string, assetId: string, evidenceId: string): void {
  const asset = getPortfolioAsset(tenantId, assetId);
  if (!asset) return;
  if (!asset.evidenceIds.includes(evidenceId)) {
    updatePortfolioAsset(tenantId, assetId, { evidenceIds: [...asset.evidenceIds, evidenceId] });
  }
}

// ─── Governance Rules ─────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function renewalRiskLevel(days: number): PortfolioRenewal["renewalRisk"] {
  if (days <= 30) return "CRITICAL";
  if (days <= 60) return "HIGH";
  if (days <= 90) return "MEDIUM";
  return "LOW";
}

function computeRiskScore(asset: PortfolioAsset): number {
  let score = 0;
  if (!asset.ownerId) score += 30;
  if (!asset.costCentre) score += 20;
  if (asset.renewalDate && daysUntil(asset.renewalDate) <= 90) score += 25;
  if (asset.utilisationScore !== undefined && asset.utilisationScore < 30 && (asset.annualCost ?? 0) > 5000) score += 25;
  if (asset.status === "DRIFTED") score += 40;
  return Math.min(score, 100);
}

// ─── Wedge Ingestion ──────────────────────────────────────────────────────────

async function getCertificationStatus(tenantId: string, wedgeId: string): Promise<PortfolioAsset["certificationStatus"]> {
  try {
    const registry = await getCertifiedWedgeRegistry(tenantId);
    const entry = registry.find((w) => w.wedgeId === wedgeId);
    if (!entry) return "UNKNOWN";
    if (entry.status === "CERTIFIED") return "CERTIFIED";
    if (entry.status === "PARTIAL" || entry.status === "IN_PROGRESS") return "PARTIAL";
    return "NOT_CERTIFIED";
  } catch {
    return "UNKNOWN";
  }
}

function makeAsset(tenantId: string, partial: Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">): PortfolioAsset {
  return createPortfolioAsset(partial);
}

export async function ingestM365PortfolioAssets(tenantId: string): Promise<PortfolioAsset[]> {
  const certStatus = await getCertificationStatus(tenantId, "m365");
  const demoAssets: Array<Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">> = [
    { tenantId, name: "Microsoft 365 E3 Licences", assetType: "M365", sourceWedge: "M365", sourceId: "m365-e3-licences", sourceSystem: "MICROSOFT_365", vendor: "Microsoft", product: "Microsoft 365 E3", environment: "PRODUCTION", status: "ACTIVE", ownerName: "IT Operations", businessUnit: "Corporate IT", costCentre: "CC-IT-001", monthlyCost: 18500, annualCost: 222000, monthlyValue: 22000, annualValue: 264000, protectedMonthlyValue: 8000, protectedAnnualValue: 96000, utilisationScore: 68, riskScore: 15, governanceScore: 80, trustScore: 85, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
    { tenantId, name: "Microsoft 365 F1 Licences", assetType: "M365", sourceWedge: "M365", sourceId: "m365-f1-licences", sourceSystem: "MICROSOFT_365", vendor: "Microsoft", product: "Microsoft 365 F1", environment: "PRODUCTION", status: "UNDER_REVIEW", ownerName: "IT Operations", businessUnit: "Corporate IT", costCentre: "CC-IT-001", monthlyCost: 4200, annualCost: 50400, monthlyValue: 5000, annualValue: 60000, protectedMonthlyValue: 2000, protectedAnnualValue: 24000, utilisationScore: 42, riskScore: 30, governanceScore: 70, trustScore: 80, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
  ];
  return demoAssets.map((a) => makeAsset(tenantId, a));
}

export async function ingestAIPortfolioAssets(tenantId: string): Promise<PortfolioAsset[]> {
  const certStatus = await getCertificationStatus(tenantId, "ai");
  const demoAssets: Array<Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">> = [
    { tenantId, name: "AI Economic Control Engine", assetType: "AI_ASSET", sourceWedge: "AI", sourceId: "ai-economic-control-engine", sourceSystem: "AI_GOVERNANCE", vendor: "Certen", product: "AI Economic Control", environment: "PRODUCTION", status: "ACTIVE", ownerName: "AI Platform Team", businessUnit: "Engineering", costCentre: "CC-ENG-002", monthlyCost: 12000, annualCost: 144000, monthlyValue: 18000, annualValue: 216000, protectedMonthlyValue: 10000, protectedAnnualValue: 120000, utilisationScore: 85, riskScore: 10, governanceScore: 90, trustScore: 92, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
    { tenantId, name: "AI Recommendation Scoring", assetType: "AI_ASSET", sourceWedge: "AI", sourceId: "ai-recommendation-scoring", sourceSystem: "AI_GOVERNANCE", vendor: "Certen", product: "AI Recommendation Scoring", environment: "PRODUCTION", status: "ACTIVE", ownerName: "AI Platform Team", businessUnit: "Engineering", costCentre: "CC-ENG-002", monthlyCost: 6000, annualCost: 72000, monthlyValue: 9000, annualValue: 108000, protectedMonthlyValue: 5000, protectedAnnualValue: 60000, utilisationScore: 78, riskScore: 12, governanceScore: 88, trustScore: 90, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
  ];
  return demoAssets.map((a) => makeAsset(tenantId, a));
}

export async function ingestServiceNowPortfolioAssets(tenantId: string): Promise<PortfolioAsset[]> {
  const certStatus = await getCertificationStatus(tenantId, "servicenow");
  const demoAssets: Array<Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">> = [
    { tenantId, name: "ServiceNow ITSM Platform", assetType: "SERVICENOW_ARTIFACT", sourceWedge: "SERVICENOW", sourceId: "servicenow-itsm", sourceSystem: "SERVICENOW", vendor: "ServiceNow", product: "ITSM", environment: "PRODUCTION", status: "ACTIVE", ownerName: "Service Management", businessUnit: "IT Operations", costCentre: "CC-OPS-003", monthlyCost: 25000, annualCost: 300000, monthlyValue: 30000, annualValue: 360000, protectedMonthlyValue: 12000, protectedAnnualValue: 144000, utilisationScore: 80, riskScore: 20, governanceScore: 75, trustScore: 82, renewalDate: new Date(Date.now() + 75 * 86400000).toISOString().split("T")[0], recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
  ];
  return demoAssets.map((a) => makeAsset(tenantId, a));
}

export async function ingestAwsPortfolioAssets(tenantId: string): Promise<PortfolioAsset[]> {
  const certStatus = await getCertificationStatus(tenantId, "aws");
  const demoAssets: Array<Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">> = [
    { tenantId, name: "AWS EC2 Fleet", assetType: "AWS_RESOURCE", sourceWedge: "AWS", sourceId: "aws-ec2-fleet", sourceSystem: "AWS", vendor: "Amazon", product: "EC2", environment: "PRODUCTION", status: "ACTIVE", ownerName: "Cloud Engineering", businessUnit: "Infrastructure", costCentre: "CC-INFRA-004", monthlyCost: 45000, annualCost: 540000, monthlyValue: 52000, annualValue: 624000, protectedMonthlyValue: 20000, protectedAnnualValue: 240000, utilisationScore: 55, riskScore: 25, governanceScore: 78, trustScore: 80, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
    { tenantId, name: "AWS RDS Databases", assetType: "AWS_RESOURCE", sourceWedge: "AWS", sourceId: "aws-rds-databases", sourceSystem: "AWS", vendor: "Amazon", product: "RDS", environment: "PRODUCTION", status: "ACTIVE", ownerName: "Data Engineering", businessUnit: "Data Platform", costCentre: "CC-DATA-005", monthlyCost: 18000, annualCost: 216000, monthlyValue: 21000, annualValue: 252000, protectedMonthlyValue: 8000, protectedAnnualValue: 96000, utilisationScore: 72, riskScore: 18, governanceScore: 82, trustScore: 85, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
  ];
  return demoAssets.map((a) => makeAsset(tenantId, a));
}

export async function ingestAzurePortfolioAssets(tenantId: string): Promise<PortfolioAsset[]> {
  const certStatus = await getCertificationStatus(tenantId, "azure");
  const demoAssets: Array<Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">> = [
    { tenantId, name: "Azure Virtual Machines", assetType: "AZURE_RESOURCE", sourceWedge: "AZURE", sourceId: "azure-vms", sourceSystem: "AZURE", vendor: "Microsoft", product: "Azure Virtual Machines", environment: "PRODUCTION", status: "ACTIVE", ownerName: "Cloud Engineering", businessUnit: "Infrastructure", costCentre: "CC-INFRA-004", monthlyCost: 32000, annualCost: 384000, monthlyValue: 38000, annualValue: 456000, protectedMonthlyValue: 15000, protectedAnnualValue: 180000, utilisationScore: 60, riskScore: 22, governanceScore: 79, trustScore: 81, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
  ];
  return demoAssets.map((a) => makeAsset(tenantId, a));
}

export async function ingestSnowflakePortfolioAssets(tenantId: string): Promise<PortfolioAsset[]> {
  const certStatus = await getCertificationStatus(tenantId, "data-platform");
  const demoAssets: Array<Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">> = [
    { tenantId, name: "Snowflake Production Warehouse", assetType: "SNOWFLAKE_WAREHOUSE", sourceWedge: "SNOWFLAKE", sourceId: "snowflake-prod-warehouse", sourceSystem: "SNOWFLAKE", vendor: "Snowflake", product: "Snowflake Data Cloud", environment: "PRODUCTION", status: "ACTIVE", ownerName: "Data Platform Team", businessUnit: "Data Platform", costCentre: "CC-DATA-005", monthlyCost: 28000, annualCost: 336000, monthlyValue: 34000, annualValue: 408000, protectedMonthlyValue: 14000, protectedAnnualValue: 168000, utilisationScore: 65, riskScore: 20, governanceScore: 80, trustScore: 83, renewalDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0], recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
  ];
  return demoAssets.map((a) => makeAsset(tenantId, a));
}

export async function ingestDatabricksPortfolioAssets(tenantId: string): Promise<PortfolioAsset[]> {
  const certStatus = await getCertificationStatus(tenantId, "data-platform");
  const demoAssets: Array<Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">> = [
    { tenantId, name: "Databricks ML Cluster", assetType: "DATABRICKS_CLUSTER", sourceWedge: "DATABRICKS", sourceId: "databricks-ml-cluster", sourceSystem: "DATABRICKS", vendor: "Databricks", product: "Databricks Lakehouse", environment: "PRODUCTION", status: "ACTIVE", ownerName: "Data Science Team", businessUnit: "Data Platform", costCentre: "CC-DATA-005", monthlyCost: 22000, annualCost: 264000, monthlyValue: 26000, annualValue: 312000, protectedMonthlyValue: 10000, protectedAnnualValue: 120000, utilisationScore: 58, riskScore: 28, governanceScore: 74, trustScore: 78, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
  ];
  return demoAssets.map((a) => makeAsset(tenantId, a));
}

export async function ingestItamPortfolioAssets(tenantId: string): Promise<PortfolioAsset[]> {
  const certStatus = await getCertificationStatus(tenantId, "itam");
  const itamAssets = listItamAssets(tenantId);
  if (itamAssets.length > 0) {
    return itamAssets.map((a) =>
      makeAsset(tenantId, {
        tenantId,
        name: `${a.vendor ?? "Unknown"} ${a.product ?? a.id}`,
        assetType: "ITAM_ASSET",
        sourceWedge: "ITAM",
        sourceId: a.id,
        sourceSystem: a.sourceSystem,
        vendor: a.vendor,
        product: a.product,
        environment: "PRODUCTION",
        status: a.status === "ACTIVE" ? "ACTIVE" : a.status === "RETIRED" ? "RETIRED" : "UNDER_REVIEW",
        ownerId: a.owner,
        ownerName: a.owner,
        businessUnit: a.businessUnit,
        costCentre: a.costCentre,
        monthlyCost: a.monthlyCost,
        annualCost: a.annualCost,
        utilisationScore: a.utilisationScore,
        renewalDate: a.renewalDate,
        recommendationIds: [],
        governedActionIds: [],
        outcomeIds: [],
        protectedOutcomeIds: [],
        evidenceIds: [],
        certificationStatus: certStatus,
      })
    );
  }
  const demoAssets: Array<Omit<PortfolioAsset, "id" | "createdAt" | "updatedAt">> = [
    { tenantId, name: "Flexera One Platform", assetType: "ITAM_ASSET", sourceWedge: "ITAM", sourceId: "flexera-one-platform", sourceSystem: "FLEXERA", vendor: "Flexera", product: "Flexera One", environment: "PRODUCTION", status: "ACTIVE", ownerName: "IT Asset Management", businessUnit: "Corporate IT", costCentre: "CC-IT-001", monthlyCost: 8000, annualCost: 96000, monthlyValue: 10000, annualValue: 120000, protectedMonthlyValue: 4000, protectedAnnualValue: 48000, utilisationScore: 70, riskScore: 15, governanceScore: 82, trustScore: 85, renewalDate: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0], recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
    { tenantId, name: "Adobe Creative Cloud Licences", assetType: "ITAM_ASSET", sourceWedge: "ITAM", sourceId: "adobe-cc-licences", sourceSystem: "FLEXERA", vendor: "Adobe", product: "Creative Cloud", environment: "PRODUCTION", status: "UNDER_REVIEW", businessUnit: "Marketing", monthlyCost: 5500, annualCost: 66000, monthlyValue: 6000, annualValue: 72000, utilisationScore: 35, riskScore: 45, governanceScore: 55, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: certStatus },
  ];
  return demoAssets.map((a) => makeAsset(tenantId, a));
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function syncTechnologyPortfolioAuthority(tenantId: string): Promise<PortfolioAsset[]> {
  const [m365, ai, servicenow, aws, azure, snowflake, databricks, itam] = await Promise.all([
    ingestM365PortfolioAssets(tenantId),
    ingestAIPortfolioAssets(tenantId),
    ingestServiceNowPortfolioAssets(tenantId),
    ingestAwsPortfolioAssets(tenantId),
    ingestAzurePortfolioAssets(tenantId),
    ingestSnowflakePortfolioAssets(tenantId),
    ingestDatabricksPortfolioAssets(tenantId),
    ingestItamPortfolioAssets(tenantId),
  ]);

  // Attach renewal risk to assets with upcoming renewals
  const allIngested = [...m365, ...ai, ...servicenow, ...aws, ...azure, ...snowflake, ...databricks, ...itam];
  for (const asset of allIngested) {
    if (asset.renewalDate) {
      const days = daysUntil(asset.renewalDate);
      if (days <= 90) {
        const contract = createPortfolioContract({
          tenantId,
          vendor: asset.vendor ?? "Unknown",
          contractName: `${asset.name} Contract`,
          renewalDate: asset.renewalDate,
          annualValue: asset.annualCost,
          linkedAssetIds: [asset.id],
          riskLevel: days <= 30 ? "CRITICAL" : days <= 60 ? "HIGH" : "MEDIUM",
          status: "RENEWAL_DUE",
        });
        createPortfolioRenewal({
          tenantId,
          contractId: contract.id,
          renewalDate: asset.renewalDate,
          daysUntilRenewal: days,
          renewalRisk: renewalRiskLevel(days),
          linkedRecommendationIds: [],
          linkedActionIds: [],
        });
        updatePortfolioAsset(tenantId, asset.id, { contractId: contract.id });
      }
    }
  }

  return allIngested;
}

// ─── Health Authority ─────────────────────────────────────────────────────────

export async function getTechnologyPortfolioHealth(tenantId: string): Promise<TechnologyPortfolioHealth> {
  const assets = listPortfolioAssets(tenantId);
  const renewals = listPortfolioRenewals(tenantId);

  const wedges: PortfolioAsset["sourceWedge"][] = ["M365", "AI", "SERVICENOW", "AWS", "AZURE", "SNOWFLAKE", "DATABRICKS", "ITAM"];

  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => a.status === "ACTIVE" || a.status === "PROTECTED").length;
  const retiredAssets = assets.filter((a) => a.status === "RETIRED").length;
  const certifiedAssets = assets.filter((a) => a.certificationStatus === "CERTIFIED").length;
  const uncertifiedAssets = assets.filter((a) => a.certificationStatus === "NOT_CERTIFIED").length;

  const totalMonthlyCost = assets.reduce((s, a) => s + (a.monthlyCost ?? 0), 0);
  const totalAnnualCost = assets.reduce((s, a) => s + (a.annualCost ?? 0), 0);
  const totalMonthlyValue = assets.reduce((s, a) => s + (a.monthlyValue ?? 0), 0);
  const totalAnnualValue = assets.reduce((s, a) => s + (a.annualValue ?? 0), 0);
  const protectedMonthlyValue = assets.reduce((s, a) => s + (a.protectedMonthlyValue ?? 0), 0);
  const protectedAnnualValue = assets.reduce((s, a) => s + (a.protectedAnnualValue ?? 0), 0);

  const pct = (n: number) => totalAssets === 0 ? 0 : Math.round((n / totalAssets) * 100);

  const withOwner = assets.filter((a) => Boolean(a.ownerId ?? a.ownerName)).length;
  const withCostCentre = assets.filter((a) => Boolean(a.costCentre)).length;
  const withUtilisation = assets.filter((a) => a.utilisationScore !== undefined).length;
  const withCertification = certifiedAssets;
  const withGovernance = assets.filter((a) => (a.governanceScore ?? 0) > 0).length;

  const ownerCoveragePercent = pct(withOwner);
  const costCentreCoveragePercent = pct(withCostCentre);
  const utilisationCoveragePercent = pct(withUtilisation);
  const certificationCoveragePercent = pct(withCertification);
  const governanceCoveragePercent = pct(withGovernance);

  // Score assets dynamically
  const scoredAssets = assets.map((a) => ({ ...a, riskScore: computeRiskScore(a) }));

  const highRiskAssets = scoredAssets.filter((a) => (a.riskScore ?? 0) >= 40).length;
  const driftedAssets = assets.filter((a) => a.status === "DRIFTED").length;
  const renewalRiskAssets = renewals.filter((r) => r.daysUntilRenewal <= 90).length;
  const optimisationOpportunities = assets.filter(
    (a) => (a.utilisationScore ?? 100) < 40 && (a.annualCost ?? 0) > 10000
  ).length;

  const topRiskAssets = [...scoredAssets].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).slice(0, 5);
  const topValueAssets = [...assets].sort((a, b) => (b.annualValue ?? 0) - (a.annualValue ?? 0)).slice(0, 5);
  const upcomingRenewals = [...renewals].sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal).slice(0, 10);

  const domainBreakdown = wedges.map((wedge) => {
    const wedgeAssets = scoredAssets.filter((a) => a.sourceWedge === wedge);
    return {
      sourceWedge: wedge,
      assetCount: wedgeAssets.length,
      monthlyCost: wedgeAssets.reduce((s, a) => s + (a.monthlyCost ?? 0), 0),
      annualCost: wedgeAssets.reduce((s, a) => s + (a.annualCost ?? 0), 0),
      protectedAnnualValue: wedgeAssets.reduce((s, a) => s + (a.protectedAnnualValue ?? 0), 0),
      highRiskAssets: wedgeAssets.filter((a) => (a.riskScore ?? 0) >= 40).length,
      certifiedAssets: wedgeAssets.filter((a) => a.certificationStatus === "CERTIFIED").length,
    };
  });

  const blockers: string[] = [];
  if (withOwner < totalAssets) blockers.push(`${totalAssets - withOwner} asset(s) missing owner assignment`);
  if (withCostCentre < totalAssets) blockers.push(`${totalAssets - withCostCentre} asset(s) missing cost centre`);
  if (renewalRiskAssets > 0) blockers.push(`${renewalRiskAssets} renewal(s) due within 90 days`);
  if (highRiskAssets > 0) blockers.push(`${highRiskAssets} high-risk asset(s) require remediation`);

  return {
    tenantId,
    totalAssets,
    activeAssets,
    retiredAssets,
    certifiedAssets,
    uncertifiedAssets,
    totalMonthlyCost,
    totalAnnualCost,
    totalMonthlyValue,
    totalAnnualValue,
    protectedMonthlyValue,
    protectedAnnualValue,
    ownerCoveragePercent,
    costCentreCoveragePercent,
    utilisationCoveragePercent,
    certificationCoveragePercent,
    governanceCoveragePercent,
    highRiskAssets,
    driftedAssets,
    renewalRiskAssets,
    optimisationOpportunities,
    topRiskAssets,
    topValueAssets,
    upcomingRenewals,
    domainBreakdown,
    blockers,
  };
}

// ─── Platform Authority Registry Entry ───────────────────────────────────────

export type TechnologyPortfolioAuthorityStatus = {
  authorityId: "technology-portfolio-authority";
  name: "Technology Portfolio Authority";
  type: "PLATFORM_AUTHORITY";
  status: "CERTIFIED" | "PARTIAL" | "NOT_CERTIFIED";
  certificationRequirements: {
    portfolioAssetsSynced: boolean;
    allCertifiedWedgesRepresented: boolean;
    healthSummaryAvailable: boolean;
    ownerCoverageCalculated: boolean;
    costCoverageCalculated: boolean;
    actionOutcomeProtectionLinksPresent: boolean;
    uiAvailable: boolean;
  };
  blockers: string[];
  certifiedAt?: string;
};

export async function getTechnologyPortfolioAuthorityStatus(tenantId: string): Promise<TechnologyPortfolioAuthorityStatus> {
  const assets = listPortfolioAssets(tenantId);
  const wedgeIds: PortfolioAsset["sourceWedge"][] = ["M365", "AI", "SERVICENOW", "AWS", "AZURE", "SNOWFLAKE", "DATABRICKS", "ITAM"];

  const portfolioAssetsSynced = assets.length > 0;
  const allCertifiedWedgesRepresented = wedgeIds.every((w) => assets.some((a) => a.sourceWedge === w));
  const healthSummaryAvailable = portfolioAssetsSynced;
  const ownerCoverageCalculated = portfolioAssetsSynced;
  const costCoverageCalculated = assets.some((a) => (a.annualCost ?? 0) > 0);
  const actionOutcomeProtectionLinksPresent = assets.some((a) => a.governedActionIds.length > 0 || a.outcomeIds.length > 0 || a.protectedOutcomeIds.length > 0);
  const uiAvailable = true;

  const req = {
    portfolioAssetsSynced,
    allCertifiedWedgesRepresented,
    healthSummaryAvailable,
    ownerCoverageCalculated,
    costCoverageCalculated,
    actionOutcomeProtectionLinksPresent,
    uiAvailable,
  };

  const blockers: string[] = [];
  if (!portfolioAssetsSynced) blockers.push("Portfolio assets not yet synced");
  if (!allCertifiedWedgesRepresented) {
    const missing = wedgeIds.filter((w) => !assets.some((a) => a.sourceWedge === w));
    blockers.push(`Wedge(s) not represented: ${missing.join(", ")}`);
  }
  if (!costCoverageCalculated) blockers.push("No cost data available");
  if (!actionOutcomeProtectionLinksPresent) blockers.push("No governed action / outcome / protection links present");

  const allMet = Object.values(req).every(Boolean);
  const someMet = Object.values(req).some(Boolean);

  return {
    authorityId: "technology-portfolio-authority",
    name: "Technology Portfolio Authority",
    type: "PLATFORM_AUTHORITY",
    status: allMet ? "CERTIFIED" : someMet ? "PARTIAL" : "NOT_CERTIFIED",
    certificationRequirements: req,
    blockers,
    certifiedAt: allMet ? new Date().toISOString() : undefined,
  };
}

// ─── Test Helpers ─────────────────────────────────────────────────────────────

export function clearTechnologyPortfolioStores(): void {
  assetStore.clear();
  ownerStore.clear();
  contractStore.clear();
  renewalStore.clear();
}
