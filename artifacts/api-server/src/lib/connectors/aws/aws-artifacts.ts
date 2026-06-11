export type AwsArtifact = {
  id: string;
  tenantId: string;
  executionId: string;
  actionId: string;
  artifactType: "EC2" | "RDS" | "EBS" | "EIP" | "SAVINGS_PLAN" | "RESERVED_INSTANCE";
  resourceId: string;
  state: "ACTIVE" | "STOPPED" | "RESIZED" | "DELETED" | "TAGGED" | "REVIEW_CREATED" | "UNKNOWN";
  monthlyCostBefore?: number;
  monthlyCostAfter?: number;
  ownerBefore?: string;
  ownerAfter?: string;
  createdAt: string;
  updatedAt: string;
};

const artifacts = new Map<string, AwsArtifact>();
const key = (tenantId: string, id: string) => `${tenantId}:${id}`;

export function upsertAwsArtifact(artifact: AwsArtifact) {
  artifacts.set(key(artifact.tenantId, artifact.id), artifact);
  return artifact;
}

export function listAwsArtifacts(tenantId: string) {
  return [...artifacts.values()].filter((artifact) => artifact.tenantId === tenantId);
}

export function getAwsArtifactByExecution(tenantId: string, executionId: string) {
  return [...artifacts.values()].find((artifact) => artifact.tenantId === tenantId && artifact.executionId === executionId) ?? null;
}

export function clearAwsArtifacts() {
  artifacts.clear();
}
