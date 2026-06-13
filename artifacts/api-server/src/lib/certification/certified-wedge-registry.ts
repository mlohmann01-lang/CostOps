import { buildM365WedgeCertification } from "../connectors/m365/m365-wedge-certification";
import { getAIWedgeCertification } from "../ai-economic-control/ai-wedge-certification";
import { getServiceNowWedgeCertification } from "../connectors/servicenow/servicenow-wedge-certification";
import { getDataPlatformWedgeCertification } from "../connectors/data-platform/data-platform-wedge-certification";
import { getAwsWedgeCertification } from "../connectors/aws/aws-wedge-certification";
import { getAzureWedgeCertification } from "../connectors/azure/azure-wedge-certification";
import { getItamWedgeCertification } from "../connectors/itam/itam-wedge-certification";

export type WedgeCertificationStatus = "CERTIFIED" | "NOT_CERTIFIED" | "PARTIAL" | "IN_PROGRESS" | "NOT_IMPLEMENTED";
export type WedgeExecutionClass = "REAL_PROVIDER_EXECUTION" | "CONTROLLED_EXECUTION" | "SIMULATED_ONLY" | "NOT_IMPLEMENTED";

export type CertifiedWedgePlaybookEntry = {
  playbookId: string;
  name: string;
  status: WedgeCertificationStatus;
  executionClass: WedgeExecutionClass;
  blockers: string[];
};

export type CertifiedWedgeRegistryEntry = {
  wedgeId: string;
  name: string;
  domain: "M365" | "AI" | "SERVICENOW" | "DATA_PLATFORM" | "AWS" | "AZURE" | "ITAM";
  status: WedgeCertificationStatus;
  executionClass: WedgeExecutionClass;
  certifiedPlaybooks: number;
  totalPlaybooks: number;
  discoveryComplete: boolean;
  trustComplete: boolean;
  approvalComplete: boolean;
  executionComplete: boolean;
  rollbackComplete: boolean;
  verificationComplete: boolean;
  outcomeComplete: boolean;
  protectionComplete: boolean;
  driftComplete: boolean;
  executiveProofComplete: boolean;
  liveTenantReady: boolean;
  productionReady: boolean;
  blockers: string[];
  lastCertifiedAt?: string;
  certificationSource: string;
  playbooks: CertifiedWedgePlaybookEntry[];
};

export type CertifiedWedgeRegistrySummary = {
  totalWedges: number;
  certifiedWedges: number;
  partialWedges: number;
  notCertifiedWedges: number;
  totalPlaybooks: number;
  certifiedPlaybooks: number;
  controlledExecutionWedges: number;
  realProviderExecutionWedges: number;
  simulatedOnlyWedges: number;
  liveTenantReadyWedges: number;
  productionReadyWedges: number;
  blockers: string[];
  wedges: CertifiedWedgeRegistryEntry[];
};

type RawPlaybook = {
  playbookId?: string;
  assetId?: string;
  name?: string;
  execution: string;
  certified: boolean;
  blockers: string[];
  discovery: string;
  trust: string;
  approval: string;
  rollback: string;
  verification: string;
  outcome: string;
  protection: string;
  drift: string;
  executiveProof: string;
};

function toExecutionClass(raw: string): WedgeExecutionClass {
  if (raw === "REAL_PROVIDER_EXECUTION") return "REAL_PROVIDER_EXECUTION";
  if (raw === "CONTROLLED_EXECUTION") return "CONTROLLED_EXECUTION";
  if (raw === "SIMULATED_ONLY") return "SIMULATED_ONLY";
  return "NOT_IMPLEMENTED";
}

function toStatus(certified: boolean, totalPlaybooks: number, certifiedCount: number): WedgeCertificationStatus {
  if (certified && certifiedCount === totalPlaybooks) return "CERTIFIED";
  if (certifiedCount > 0) return "PARTIAL";
  return "NOT_CERTIFIED";
}

function dominantExecutionClass(playbooks: RawPlaybook[]): WedgeExecutionClass {
  if (playbooks.some((p) => p.execution === "REAL_PROVIDER_EXECUTION" && p.certified)) return "REAL_PROVIDER_EXECUTION";
  if (playbooks.some((p) => p.execution === "CONTROLLED_EXECUTION" && p.certified)) return "CONTROLLED_EXECUTION";
  if (playbooks.some((p) => p.execution === "SIMULATED_ONLY")) return "SIMULATED_ONLY";
  return "NOT_IMPLEMENTED";
}

function lifecycleComplete(playbooks: RawPlaybook[], field: keyof RawPlaybook): boolean {
  return playbooks.length > 0 && playbooks.some((p) => p[field] === "COMPLETE");
}

function normalizePlaybooks(playbooks: RawPlaybook[]): CertifiedWedgePlaybookEntry[] {
  return playbooks.map((p) => ({
    playbookId: p.playbookId ?? p.assetId ?? "unknown",
    name: p.name ?? p.assetId ?? "Unknown Playbook",
    status: p.certified ? "CERTIFIED" : "NOT_CERTIFIED",
    executionClass: toExecutionClass(p.execution),
    blockers: p.blockers,
  }));
}

function buildEntry(opts: {
  wedgeId: string;
  name: string;
  domain: CertifiedWedgeRegistryEntry["domain"];
  certified: boolean;
  playbooks: RawPlaybook[];
  certificationSource: string;
}): CertifiedWedgeRegistryEntry {
  const certifiedCount = opts.playbooks.filter((p) => p.certified).length;
  const totalPlaybooks = opts.playbooks.length;
  const execClass = dominantExecutionClass(opts.playbooks);
  const status = toStatus(opts.certified, totalPlaybooks, certifiedCount);
  const allBlockers = [...new Set(opts.playbooks.flatMap((p) => p.blockers))];
  const simulatedOnly = opts.playbooks.some((p) => p.execution === "SIMULATED_ONLY" && !p.certified);
  return {
    wedgeId: opts.wedgeId,
    name: opts.name,
    domain: opts.domain,
    status,
    executionClass: execClass,
    certifiedPlaybooks: certifiedCount,
    totalPlaybooks,
    discoveryComplete: lifecycleComplete(opts.playbooks, "discovery"),
    trustComplete: lifecycleComplete(opts.playbooks, "trust"),
    approvalComplete: lifecycleComplete(opts.playbooks, "approval"),
    executionComplete: opts.playbooks.some((p) => ["CONTROLLED_EXECUTION", "REAL_PROVIDER_EXECUTION"].includes(p.execution)),
    rollbackComplete: lifecycleComplete(opts.playbooks, "rollback"),
    verificationComplete: lifecycleComplete(opts.playbooks, "verification"),
    outcomeComplete: lifecycleComplete(opts.playbooks, "outcome"),
    protectionComplete: lifecycleComplete(opts.playbooks, "protection"),
    driftComplete: lifecycleComplete(opts.playbooks, "drift"),
    executiveProofComplete: lifecycleComplete(opts.playbooks, "executiveProof"),
    liveTenantReady: opts.certified && !simulatedOnly && allBlockers.length === 0,
    productionReady: opts.certified && !simulatedOnly && allBlockers.length === 0 && execClass !== "SIMULATED_ONLY",
    blockers: allBlockers,
    lastCertifiedAt: opts.certified ? new Date().toISOString() : undefined,
    certificationSource: opts.certificationSource,
    playbooks: normalizePlaybooks(opts.playbooks),
  };
}

export async function getCertifiedWedgeRegistry(tenantId: string): Promise<CertifiedWedgeRegistryEntry[]> {
  const [m365, ai, servicenow, dataPlatform, aws, azure, itam] = await Promise.all([
    buildM365WedgeCertification(tenantId),
    getAIWedgeCertification(tenantId),
    getServiceNowWedgeCertification(tenantId),
    getDataPlatformWedgeCertification(tenantId),
    getAwsWedgeCertification(tenantId),
    getAzureWedgeCertification(tenantId),
    getItamWedgeCertification(tenantId),
  ]);

  const aiCertified = (ai.certifiedAssets ?? 0) > 0 && ai.uncertifiedAssets === 0;
  const aiPlaybooks: RawPlaybook[] = ai.certifications.map((c) => ({
    playbookId: c.assetId,
    assetId: c.assetId,
    name: c.assetId,
    execution: c.execution,
    certified: c.certified,
    blockers: c.blockers,
    discovery: c.discovery,
    trust: c.trust,
    approval: c.approval,
    rollback: c.rollback,
    verification: c.verification,
    outcome: c.outcome,
    protection: c.protection,
    drift: c.drift,
    executiveProof: c.executiveProof,
  }));

  return [
    buildEntry({ wedgeId: "m365", name: "M365 Cost Governance", domain: "M365", certified: Boolean((m365 as any).certified), playbooks: (m365 as any).playbooks ?? [], certificationSource: "m365-wedge-certification" }),
    buildEntry({ wedgeId: "ai", name: "AI Economic Control", domain: "AI", certified: aiCertified, playbooks: aiPlaybooks, certificationSource: "ai-wedge-certification" }),
    buildEntry({ wedgeId: "servicenow", name: "ServiceNow Execution", domain: "SERVICENOW", certified: Boolean(servicenow.certified), playbooks: servicenow.playbooks ?? [], certificationSource: "servicenow-wedge-certification" }),
    buildEntry({ wedgeId: "data-platform", name: "Snowflake + Databricks Data Platform", domain: "DATA_PLATFORM", certified: Boolean(dataPlatform.certified), playbooks: dataPlatform.playbooks ?? [], certificationSource: "data-platform-wedge-certification" }),
    buildEntry({ wedgeId: "aws", name: "AWS Cost Governance", domain: "AWS", certified: Boolean(aws.certified), playbooks: aws.playbooks ?? [], certificationSource: "aws-wedge-certification" }),
    buildEntry({ wedgeId: "azure", name: "Azure Cost Governance", domain: "AZURE", certified: Boolean(azure.certified), playbooks: azure.playbooks ?? [], certificationSource: "azure-wedge-certification" }),
    buildEntry({ wedgeId: "itam", name: "ITAM / Flexera Cost Governance", domain: "ITAM", certified: Boolean(itam.certified), playbooks: itam.playbooks ?? [], certificationSource: "itam-wedge-certification" }),
  ];
}

export async function getCertifiedWedgeRegistrySummary(tenantId: string): Promise<CertifiedWedgeRegistrySummary> {
  const wedges = await getCertifiedWedgeRegistry(tenantId);
  const certified = wedges.filter((w) => w.status === "CERTIFIED");
  const partial = wedges.filter((w) => w.status === "PARTIAL");
  const notCertified = wedges.filter((w) => w.status === "NOT_CERTIFIED");
  const allBlockers = [...new Set(wedges.flatMap((w) => w.blockers))];
  return {
    totalWedges: wedges.length,
    certifiedWedges: certified.length,
    partialWedges: partial.length,
    notCertifiedWedges: notCertified.length,
    totalPlaybooks: wedges.reduce((sum, w) => sum + w.totalPlaybooks, 0),
    certifiedPlaybooks: wedges.reduce((sum, w) => sum + w.certifiedPlaybooks, 0),
    controlledExecutionWedges: wedges.filter((w) => w.executionClass === "CONTROLLED_EXECUTION").length,
    realProviderExecutionWedges: wedges.filter((w) => w.executionClass === "REAL_PROVIDER_EXECUTION").length,
    simulatedOnlyWedges: wedges.filter((w) => w.executionClass === "SIMULATED_ONLY").length,
    liveTenantReadyWedges: wedges.filter((w) => w.liveTenantReady).length,
    productionReadyWedges: wedges.filter((w) => w.productionReady).length,
    blockers: allBlockers,
    wedges,
  };
}
