export const CONNECTOR_DOMAINS = ["M365","SERVICENOW","SNOWFLAKE","DATABRICKS","AWS","AZURE","GCP","ORACLE_GOVERNANCE","KUBERNETES_READONLY"] as const;
export type ConnectorDomain = (typeof CONNECTOR_DOMAINS)[number];
export const CAPABILITY_CLASSES = ["READ_ONLY","RECOMMEND_ONLY","DRY_RUN","APPROVAL_REQUIRED","REVERSIBLE_EXECUTION","MANUAL_ONLY","NEVER_ALLOWED"] as const;
export type CapabilityClass = (typeof CAPABILITY_CLASSES)[number];
export interface ConnectorActionCapability { connector: ConnectorDomain; action: string; capability: CapabilityClass; permissionScope: string; reversible: boolean; idempotent: boolean; }
