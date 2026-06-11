export type AzureArtifact = {
  id: string;
  tenantId: string;
  executionId: string;
  actionId: string;
  artifactType: "VM" | "SQL" | "MANAGED_DISK" | "PUBLIC_IP" | "RESERVED_INSTANCE" | "SAVINGS_PLAN";
  resourceId: string;
  state: "ACTIVE" | "STOPPED" | "RESIZED" | "DELETED" | "TAGGED" | "REVIEW_CREATED" | "UNKNOWN";
  monthlyCostBefore?: number;
  monthlyCostAfter?: number;
  ownerBefore?: string;
  ownerAfter?: string;
  createdAt: string;
  updatedAt: string;
};

const artifacts = new Map<string, AzureArtifact>();
const key = (tenantId: string, id: string) => `${tenantId}:${id}`;
export function upsertAzureArtifact(artifact: AzureArtifact) { artifacts.set(key(artifact.tenantId, artifact.id), artifact); return artifact; }
export function listAzureArtifacts(tenantId: string) { return [...artifacts.values()].filter((artifact) => artifact.tenantId === tenantId); }
export function getAzureArtifactByExecution(tenantId: string, executionId: string) { return [...artifacts.values()].find((artifact) => artifact.tenantId === tenantId && artifact.executionId === executionId) ?? null; }
export function clearAzureArtifacts() { artifacts.clear(); }
