export type DataPlatformProvider = "SNOWFLAKE" | "DATABRICKS";
export type DataPlatformArtifact = {
  id: string; tenantId: string; executionId: string; actionId: string; provider: DataPlatformProvider;
  artifactType: "WAREHOUSE" | "CLUSTER" | "JOB" | "SPEND_REVIEW" | "COST_OWNER_TAG";
  providerId: string; name: string;
  state: "ACTIVE" | "SUSPENDED" | "TERMINATED" | "RESIZED" | "AUTO_SUSPEND_SET" | "AUTO_TERMINATION_SET" | "TAGGED" | "REVIEW_OPEN" | "UNKNOWN";
  sizeBefore?: string; sizeAfter?: string; autoSuspendBefore?: number; autoSuspendAfter?: number; autoTerminationBefore?: number; autoTerminationAfter?: number; monthlySpendBefore?: number; monthlySpendAfter?: number; ownerBefore?: string; ownerAfter?: string; createdAt: string; updatedAt: string;
};
const artifacts = new Map<string, DataPlatformArtifact>();
const key = (tenantId: string, id: string) => `${tenantId}:${id}`;
export function upsertDataPlatformArtifact(artifact: DataPlatformArtifact) { artifacts.set(key(artifact.tenantId, artifact.id), artifact); return artifact; }
export function listDataPlatformArtifacts(tenantId: string, provider?: DataPlatformProvider) { return [...artifacts.values()].filter((row) => row.tenantId === tenantId && (!provider || row.provider === provider)); }
export function getDataPlatformArtifactByExecution(tenantId: string, executionId: string) { return [...artifacts.values()].find((row) => row.tenantId === tenantId && row.executionId === executionId) ?? null; }
export function clearDataPlatformArtifacts() { artifacts.clear(); }
