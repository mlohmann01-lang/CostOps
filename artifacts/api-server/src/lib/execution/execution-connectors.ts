import type { ExecutionConnector, ExecutionConnectorType } from "./governed-execution";

export type ConnectorCapability =
  | "REMOVE_LICENSE"
  | "ASSIGN_LICENSE"
  | "REASSIGN_LICENSE"
  | "RESTORE_LICENSE"
  | "REMOVE_COPILOT_LICENSE"
  | "RESTORE_COPILOT_LICENSE"
  | "READ_USER_LICENSE_STATE"
  | "READ_SUBSCRIBED_SKUS"
  | "VERIFY_LICENSE_STATE"
  | "APPROVE_AI_ASSET"
  | "RETIRE_AI_ASSET"
  | "ASSIGN_AI_OWNER"
  | "ENFORCE_AI_POLICY"
  | "DISABLE_AI_ASSET"
  | "ENABLE_AI_ASSET"
  | "CREATE_CHANGE"
  | "READ_CHANGE"
  | "UPDATE_CHANGE"
  | "CLOSE_CHANGE"
  | "CREATE_TASK"
  | "READ_TASK"
  | "UPDATE_TASK"
  | "CLOSE_TASK"
  | "CREATE_APPROVAL"
  | "READ_APPROVAL"
  | "UPDATE_APPROVAL"
  | "WITHDRAW_APPROVAL"
  | "VERIFY_STATE"
  | "ASSIGN_OWNER"
  | "CREATE_TICKET"
  | "CREATE_CHANGE_REQUEST"
  | "READ_WAREHOUSE_STATE"
  | "READ_QUERY_HISTORY"
  | "READ_WAREHOUSE_METERING"
  | "SET_AUTO_SUSPEND"
  | "RESIZE_WAREHOUSE"
  | "SUSPEND_WAREHOUSE"
  | "TAG_COST_OWNER"
  | "VERIFY_WAREHOUSE_STATE"
  | "ROLLBACK_WAREHOUSE_CONFIG"
  | "READ_CLUSTER_STATE"
  | "READ_JOB_USAGE"
  | "READ_BILLING_USAGE"
  | "SET_AUTO_TERMINATION"
  | "RESIZE_CLUSTER"
  | "TERMINATE_CLUSTER"
  | "VERIFY_CLUSTER_STATE"
  | "ROLLBACK_CLUSTER_CONFIG"
  | "READ_EC2"
  | "MODIFY_EC2"
  | "STOP_EC2"
  | "START_EC2"
  | "READ_RDS"
  | "MODIFIY_RDS"
  | "MODIFY_RDS"
  | "STOP_RDS"
  | "START_RDS"
  | "READ_EBS"
  | "DELETE_EBS"
  | "READ_EIP"
  | "RELEASE_EIP"
  | "TAG_OWNER"
  | "READ_COST_EXPLORER"
  | "READ_CUR"
  | "VERIFY_RESOURCE_STATE"
  | "ROLLBACK_RESOURCE"
  | "READ_VM"
  | "MODIFY_VM"
  | "STOP_VM"
  | "START_VM"
  | "READ_SQL"
  | "MODIFY_SQL"
  | "STOP_SQL"
  | "START_SQL"
  | "READ_MANAGED_DISK"
  | "DELETE_MANAGED_DISK"
  | "READ_PUBLIC_IP"
  | "RELEASE_PUBLIC_IP"
  | "READ_COST_MANAGEMENT"
  | "READ_CONSUMPTION";

export const executionConnectorCapabilityRegistry: Record<ExecutionConnectorType, ConnectorCapability[]> = {
  M365: ["REMOVE_LICENSE", "ASSIGN_LICENSE", "REASSIGN_LICENSE", "RESTORE_LICENSE", "REMOVE_COPILOT_LICENSE", "RESTORE_COPILOT_LICENSE", "READ_USER_LICENSE_STATE", "READ_SUBSCRIBED_SKUS", "VERIFY_LICENSE_STATE"],
  AI: ["APPROVE_AI_ASSET", "RETIRE_AI_ASSET", "ASSIGN_AI_OWNER", "ENFORCE_AI_POLICY", "DISABLE_AI_ASSET", "ENABLE_AI_ASSET", "ASSIGN_OWNER"],
  SERVICENOW: ["CREATE_CHANGE", "READ_CHANGE", "UPDATE_CHANGE", "CLOSE_CHANGE", "CREATE_TASK", "READ_TASK", "UPDATE_TASK", "CLOSE_TASK", "CREATE_APPROVAL", "READ_APPROVAL", "UPDATE_APPROVAL", "WITHDRAW_APPROVAL", "VERIFY_STATE", "CREATE_TICKET", "CREATE_CHANGE_REQUEST"],
  JIRA: ["CREATE_TICKET"],
  AWS: ["READ_EC2", "MODIFY_EC2", "STOP_EC2", "START_EC2", "READ_RDS", "MODIFIY_RDS", "MODIFY_RDS", "STOP_RDS", "START_RDS", "READ_EBS", "DELETE_EBS", "READ_EIP", "RELEASE_EIP", "TAG_OWNER", "READ_COST_EXPLORER", "READ_CUR", "VERIFY_RESOURCE_STATE", "ROLLBACK_RESOURCE"],
  AZURE: ["READ_VM", "MODIFY_VM", "STOP_VM", "START_VM", "READ_SQL", "MODIFY_SQL", "STOP_SQL", "START_SQL", "READ_MANAGED_DISK", "DELETE_MANAGED_DISK", "READ_PUBLIC_IP", "RELEASE_PUBLIC_IP", "TAG_OWNER", "READ_COST_MANAGEMENT", "READ_CONSUMPTION", "VERIFY_RESOURCE_STATE", "ROLLBACK_RESOURCE"],
  GCP: [],
  SNOWFLAKE: ["READ_WAREHOUSE_STATE", "READ_QUERY_HISTORY", "READ_WAREHOUSE_METERING", "SET_AUTO_SUSPEND", "RESIZE_WAREHOUSE", "SUSPEND_WAREHOUSE", "TAG_COST_OWNER", "VERIFY_WAREHOUSE_STATE", "ROLLBACK_WAREHOUSE_CONFIG"],
  DATABRICKS: ["READ_CLUSTER_STATE", "READ_JOB_USAGE", "READ_BILLING_USAGE", "SET_AUTO_TERMINATION", "RESIZE_CLUSTER", "TERMINATE_CLUSTER", "TAG_COST_OWNER", "VERIFY_CLUSTER_STATE", "ROLLBACK_CLUSTER_CONFIG"],
  OTHER: [],
};

export function getConnectorCapabilities(connectorType: ExecutionConnectorType): ConnectorCapability[] {
  return executionConnectorCapabilityRegistry[connectorType] ?? [];
}

export function connectorSupportsCapability(connector: Pick<ExecutionConnector, "connectorType" | "capabilities">, capability: string): boolean {
  const declared = connector.capabilities.length > 0 ? connector.capabilities : getConnectorCapabilities(connector.connectorType);
  return declared.includes(capability as ConnectorCapability);
}

export function createDefaultExecutionConnector(input: { tenantId: string; connectorType: ExecutionConnectorType; name?: string; status?: ExecutionConnector["status"]; executionMode?: ExecutionConnector["executionMode"] }): ExecutionConnector {
  const createdAt = new Date().toISOString();
  const type = input.connectorType;
  return {
    id: `exec-connector-${type.toLowerCase()}-${input.tenantId}`,
    tenantId: input.tenantId,
    connectorType: type,
    name: input.name ?? `${type} governed execution connector`,
    status: input.status ?? "CONNECTED",
    executionMode: input.executionMode ?? "APPROVAL_REQUIRED",
    capabilities: getConnectorCapabilities(type),
    createdAt,
    updatedAt: createdAt,
  };
}
