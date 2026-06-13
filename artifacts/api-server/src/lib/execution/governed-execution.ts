import { platformEventService } from "../events/platform-event-service";
import { getPersistenceProvider, PersistenceStore } from "../persistence/persistence-provider";
import { PersistenceCollections } from "../persistence/persistence-collections";
import { governedActionService, type GovernedAction } from "../actions/governed-actions";
import { connectorSupportsCapability, createDefaultExecutionConnector } from "./execution-connectors";
import { evaluateReadinessAuthority, trustReadinessAuthorityService } from "../trust-readiness/trust-readiness-authority";
import { approvalAuthorityEngine } from "../approval-authority/approval-authority";
import { executeM365GraphOperation } from "../connectors/m365/m365-graph-execution";
import { executeAIProviderOperation } from "../ai-economic-control/ai-provider-execution";
import { executeServiceNowOperation } from "../connectors/servicenow/servicenow-execution";
import { executeSnowflakeOperation } from "../connectors/snowflake/snowflake-execution";
import { executeDatabricksOperation } from "../connectors/databricks/databricks-execution";
import { executeAwsOperation } from "../connectors/aws/aws-execution";
import { executeAzureOperation } from "../connectors/azure/azure-execution";
import { executeItamOperation } from "../connectors/itam/itam-execution";
import { assertLiveTenantExecutionAllowed, evaluateLiveTenantExecutionGate, getTenantExecutionPolicy } from "../runtime/live-tenant-safety";
import { getConnectorHealth } from "../connectors/connector-health";

export type ExecutionConnectorType = "M365" | "SERVICENOW" | "JIRA" | "AI" | "AWS" | "AZURE" | "GCP" | "SNOWFLAKE" | "DATABRICKS" | "ITAM" | "FLEXERA" | "OTHER";
export type ExecutionConnectorStatus = "CONNECTED" | "DEGRADED" | "DISCONNECTED";
export type ExecutionConnectorMode = "READ_ONLY" | "APPROVAL_REQUIRED" | "AUTO_EXECUTE_SAFE";
export type GovernedExecutionType = "LICENSE_REMOVE" | "LICENSE_ASSIGN" | "REMOVE_M365_LICENSE" | "ASSIGN_M365_LICENSE" | "REASSIGN_M365_LICENSE" | "RESTORE_M365_LICENSE" | "REMOVE_COPILOT_LICENSE" | "RESTORE_COPILOT_LICENSE" | "DOWNGRADE_M365_LICENSE" | "CONVERT_SHARED_MAILBOX_REVIEW" | "APPROVE_AI_ASSET" | "RETIRE_AI_ASSET" | "ASSIGN_AI_OWNER" | "ENFORCE_AI_POLICY" | "DISABLE_AI_ASSET" | "ENABLE_AI_ASSET" | "CREATE_SERVICENOW_CHANGE" | "UPDATE_SERVICENOW_CHANGE" | "CLOSE_SERVICENOW_CHANGE" | "CREATE_SERVICENOW_TASK" | "UPDATE_SERVICENOW_TASK" | "CLOSE_SERVICENOW_TASK" | "CREATE_SERVICENOW_APPROVAL" | "UPDATE_SERVICENOW_APPROVAL" | "WITHDRAW_SERVICENOW_APPROVAL" | "VERIFY_SERVICENOW_ARTIFACT" | "AZURE_RIGHTSIZE_VM" | "AZURE_STOP_VM" | "AZURE_START_VM" | "AZURE_MODIFY_SQL" | "AZURE_STOP_SQL" | "AZURE_START_SQL" | "AZURE_DELETE_MANAGED_DISK" | "AZURE_RELEASE_PUBLIC_IP" | "AZURE_TAG_OWNER" | "AZURE_CREATE_RI_REVIEW" | "AZURE_CREATE_SAVINGS_PLAN_REVIEW" | "AZURE_VERIFY_RESOURCE_STATE" | "AZURE_ROLLBACK_RESOURCE" | "AWS_RIGHTSIZE_EC2" | "AWS_STOP_EC2" | "AWS_START_EC2" | "AWS_MODIFY_RDS" | "AWS_STOP_RDS" | "AWS_START_RDS" | "AWS_DELETE_EBS" | "AWS_RELEASE_EIP" | "AWS_TAG_OWNER" | "AWS_CREATE_SAVINGS_PLAN_REVIEW" | "AWS_CREATE_RI_REVIEW" | "AWS_VERIFY_AWS_STATE" | "AWS_ROLLBACK_RESOURCE" | "SNOWFLAKE_SET_AUTO_SUSPEND" | "SNOWFLAKE_RESIZE_WAREHOUSE" | "SNOWFLAKE_SUSPEND_WAREHOUSE" | "SNOWFLAKE_TAG_COST_OWNER" | "SNOWFLAKE_CREATE_SPEND_REVIEW" | "SNOWFLAKE_ROLLBACK_WAREHOUSE_CONFIG" | "SNOWFLAKE_VERIFY_WAREHOUSE_STATE" | "DATABRICKS_SET_AUTO_TERMINATION" | "DATABRICKS_RESIZE_CLUSTER" | "DATABRICKS_TERMINATE_CLUSTER" | "DATABRICKS_TAG_COST_OWNER" | "DATABRICKS_CREATE_JOB_REVIEW" | "DATABRICKS_ROLLBACK_CLUSTER_CONFIG" | "DATABRICKS_VERIFY_CLUSTER_STATE" | "ITAM_ASSIGN_OWNER" | "ITAM_ASSIGN_COST_CENTRE" | "ITAM_RECLAIM_LICENSE" | "ITAM_RESTORE_LICENSE" | "ITAM_MARK_RETIRED" | "ITAM_MARK_ACTIVE" | "ITAM_CONSOLIDATE_CAPABILITY" | "ITAM_CREATE_RENEWAL_REVIEW" | "ITAM_VERIFY_ASSET_STATE" | "ITAM_ROLLBACK_ITAM_ACTION" | "OWNER_ASSIGN" | "AI_ASSET_RETIRE" | "AI_ASSET_APPROVE" | "TICKET_CREATE" | "WORKFLOW_DISABLE" | "OTHER";
export type GovernedExecutionStatus = "PLANNED" | "DRY_RUN" | "APPROVED" | "EXECUTING" | "COMPLETED" | "FAILED" | "ROLLED_BACK";
export type GovernedExecutionMode = "SIMULATION" | "MANUAL" | "CONTROLLED";
export type ExecutionBlastRadius = "LOW" | "MEDIUM" | "HIGH";
export type ExecutionEvidenceType = "PRE_STATE" | "POST_STATE" | "DRY_RUN" | "EXECUTION_RESULT" | "ROLLBACK_RESULT" | "VERIFICATION_RESULT" | "ROLLBACK_PAYLOAD";
export type ExecutionReadinessVerdict = "ELIGIBLE" | "APPROVAL_REQUIRED" | "BLOCKED" | "NEVER_ELIGIBLE";

export type ExecutionConnector = {
  id: string;
  tenantId: string;
  connectorType: ExecutionConnectorType;
  name: string;
  status: ExecutionConnectorStatus;
  executionMode: ExecutionConnectorMode;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
};

export type GovernedExecution = {
  id: string;
  tenantId: string;
  actionId: string;
  connectorId: string;
  executionType: GovernedExecutionType;
  status: GovernedExecutionStatus;
  executionMode: GovernedExecutionMode;
  blastRadius: ExecutionBlastRadius;
  rollbackSupported: boolean;
  executedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExecutionEvidence = {
  id: string;
  executionId: string;
  evidenceType: ExecutionEvidenceType;
  summary: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type ExecutionReadinessInput = {
  action?: Pick<GovernedAction, "id" | "status" | "readiness" | "trustScore" | "blastRadius" | "rollbackCapability"> | null;
  trust?: boolean | number | null;
  approval?: boolean | null;
  connector?: ExecutionConnector | null;
  executionMode?: ExecutionConnectorMode | GovernedExecutionMode;
  rollbackSupported?: boolean;
};

export type ExecutionReadiness = { verdict: ExecutionReadinessVerdict; reasons: string[] };
export type SimulateExecutionInput = { tenantId: string; actionId: string; connectorId?: string; executionType?: GovernedExecutionType; estimatedValue?: number; actor?: string; userId?: string; skuId?: string; targetSkuId?: string; dryRun?: boolean; ownerId?: string; policyId?: string; artifactType?: "CHANGE" | "TASK" | "APPROVAL"; expectedState?: string; assignedTo?: string; approvalGroup?: string };
export type ExecuteGovernedActionInput = SimulateExecutionInput & { approved?: boolean; executionMode?: GovernedExecutionMode };

const allowedExecutionTypes = new Set<GovernedExecutionType>(["OWNER_ASSIGN", "AI_ASSET_APPROVE", "AI_ASSET_RETIRE", "APPROVE_AI_ASSET", "RETIRE_AI_ASSET", "ASSIGN_AI_OWNER", "ENFORCE_AI_POLICY", "DISABLE_AI_ASSET", "ENABLE_AI_ASSET", "CREATE_SERVICENOW_CHANGE", "UPDATE_SERVICENOW_CHANGE", "CLOSE_SERVICENOW_CHANGE", "CREATE_SERVICENOW_TASK", "UPDATE_SERVICENOW_TASK", "CLOSE_SERVICENOW_TASK", "CREATE_SERVICENOW_APPROVAL", "UPDATE_SERVICENOW_APPROVAL", "WITHDRAW_SERVICENOW_APPROVAL", "VERIFY_SERVICENOW_ARTIFACT", "TICKET_CREATE", "REMOVE_M365_LICENSE", "ASSIGN_M365_LICENSE", "REASSIGN_M365_LICENSE", "RESTORE_M365_LICENSE", "REMOVE_COPILOT_LICENSE", "RESTORE_COPILOT_LICENSE", "DOWNGRADE_M365_LICENSE", "CONVERT_SHARED_MAILBOX_REVIEW", "SNOWFLAKE_SET_AUTO_SUSPEND", "SNOWFLAKE_RESIZE_WAREHOUSE", "SNOWFLAKE_SUSPEND_WAREHOUSE", "SNOWFLAKE_TAG_COST_OWNER", "SNOWFLAKE_CREATE_SPEND_REVIEW", "SNOWFLAKE_ROLLBACK_WAREHOUSE_CONFIG", "SNOWFLAKE_VERIFY_WAREHOUSE_STATE", "DATABRICKS_SET_AUTO_TERMINATION", "DATABRICKS_RESIZE_CLUSTER", "DATABRICKS_TERMINATE_CLUSTER", "DATABRICKS_TAG_COST_OWNER", "DATABRICKS_CREATE_JOB_REVIEW", "DATABRICKS_ROLLBACK_CLUSTER_CONFIG", "DATABRICKS_VERIFY_CLUSTER_STATE", "AWS_RIGHTSIZE_EC2", "AWS_STOP_EC2", "AWS_START_EC2", "AWS_MODIFY_RDS", "AWS_STOP_RDS", "AWS_START_RDS", "AWS_DELETE_EBS", "AWS_RELEASE_EIP", "AWS_TAG_OWNER", "AWS_CREATE_SAVINGS_PLAN_REVIEW", "AWS_CREATE_RI_REVIEW", "AWS_VERIFY_AWS_STATE", "AWS_ROLLBACK_RESOURCE", "AZURE_RIGHTSIZE_VM", "AZURE_STOP_VM", "AZURE_START_VM", "AZURE_MODIFY_SQL", "AZURE_STOP_SQL", "AZURE_START_SQL", "AZURE_DELETE_MANAGED_DISK", "AZURE_RELEASE_PUBLIC_IP", "AZURE_TAG_OWNER", "AZURE_CREATE_RI_REVIEW", "AZURE_CREATE_SAVINGS_PLAN_REVIEW", "AZURE_VERIFY_RESOURCE_STATE", "AZURE_ROLLBACK_RESOURCE", "ITAM_ASSIGN_OWNER", "ITAM_ASSIGN_COST_CENTRE", "ITAM_RECLAIM_LICENSE", "ITAM_RESTORE_LICENSE", "ITAM_MARK_RETIRED", "ITAM_MARK_ACTIVE", "ITAM_CONSOLIDATE_CAPABILITY", "ITAM_CREATE_RENEWAL_REVIEW", "ITAM_VERIFY_ASSET_STATE", "ITAM_ROLLBACK_ITAM_ACTION"]);
const capabilityByExecutionType: Partial<Record<GovernedExecutionType, string>> = {
  OWNER_ASSIGN: "ASSIGN_OWNER",
  AI_ASSET_APPROVE: "APPROVE_AI_ASSET",
  AI_ASSET_RETIRE: "RETIRE_AI_ASSET",
  APPROVE_AI_ASSET: "APPROVE_AI_ASSET",
  RETIRE_AI_ASSET: "RETIRE_AI_ASSET",
  ASSIGN_AI_OWNER: "ASSIGN_AI_OWNER",
  ENFORCE_AI_POLICY: "ENFORCE_AI_POLICY",
  DISABLE_AI_ASSET: "DISABLE_AI_ASSET",
  ENABLE_AI_ASSET: "ENABLE_AI_ASSET",

  CREATE_SERVICENOW_CHANGE: "CREATE_CHANGE",
  UPDATE_SERVICENOW_CHANGE: "UPDATE_CHANGE",
  CLOSE_SERVICENOW_CHANGE: "CLOSE_CHANGE",
  CREATE_SERVICENOW_TASK: "CREATE_TASK",
  UPDATE_SERVICENOW_TASK: "UPDATE_TASK",
  CLOSE_SERVICENOW_TASK: "CLOSE_TASK",
  CREATE_SERVICENOW_APPROVAL: "CREATE_APPROVAL",
  UPDATE_SERVICENOW_APPROVAL: "UPDATE_APPROVAL",
  WITHDRAW_SERVICENOW_APPROVAL: "WITHDRAW_APPROVAL",
  VERIFY_SERVICENOW_ARTIFACT: "VERIFY_STATE",
  TICKET_CREATE: "CREATE_TICKET",
  LICENSE_ASSIGN: "ASSIGN_LICENSE",
  LICENSE_REMOVE: "REMOVE_LICENSE",
  REMOVE_M365_LICENSE: "REMOVE_LICENSE",
  ASSIGN_M365_LICENSE: "ASSIGN_LICENSE",
  REASSIGN_M365_LICENSE: "REASSIGN_LICENSE",
  RESTORE_M365_LICENSE: "RESTORE_LICENSE",
  REMOVE_COPILOT_LICENSE: "REMOVE_COPILOT_LICENSE",
  RESTORE_COPILOT_LICENSE: "RESTORE_COPILOT_LICENSE",
  DOWNGRADE_M365_LICENSE: "REASSIGN_LICENSE",
  CONVERT_SHARED_MAILBOX_REVIEW: "VERIFY_LICENSE_STATE",
  AZURE_RIGHTSIZE_VM: "MODIFY_VM",
  AZURE_STOP_VM: "STOP_VM",
  AZURE_START_VM: "START_VM",
  AZURE_MODIFY_SQL: "MODIFY_SQL",
  AZURE_STOP_SQL: "STOP_SQL",
  AZURE_START_SQL: "START_SQL",
  AZURE_DELETE_MANAGED_DISK: "DELETE_MANAGED_DISK",
  AZURE_RELEASE_PUBLIC_IP: "RELEASE_PUBLIC_IP",
  AZURE_TAG_OWNER: "TAG_OWNER",
  AZURE_CREATE_RI_REVIEW: "READ_CONSUMPTION",
  AZURE_CREATE_SAVINGS_PLAN_REVIEW: "READ_COST_MANAGEMENT",
  AZURE_VERIFY_RESOURCE_STATE: "VERIFY_RESOURCE_STATE",
  AZURE_ROLLBACK_RESOURCE: "ROLLBACK_RESOURCE",
  AWS_RIGHTSIZE_EC2: "MODIFY_EC2",
  AWS_STOP_EC2: "STOP_EC2",
  AWS_START_EC2: "START_EC2",
  AWS_MODIFY_RDS: "MODIFIY_RDS",
  AWS_STOP_RDS: "STOP_RDS",
  AWS_START_RDS: "START_RDS",
  AWS_DELETE_EBS: "DELETE_EBS",
  AWS_RELEASE_EIP: "RELEASE_EIP",
  AWS_TAG_OWNER: "TAG_OWNER",
  AWS_CREATE_SAVINGS_PLAN_REVIEW: "READ_COST_EXPLORER",
  AWS_CREATE_RI_REVIEW: "READ_CUR",
  AWS_VERIFY_AWS_STATE: "VERIFY_RESOURCE_STATE",
  AWS_ROLLBACK_RESOURCE: "ROLLBACK_RESOURCE",
  SNOWFLAKE_SET_AUTO_SUSPEND: "SET_AUTO_SUSPEND",
  SNOWFLAKE_RESIZE_WAREHOUSE: "RESIZE_WAREHOUSE",
  SNOWFLAKE_SUSPEND_WAREHOUSE: "SUSPEND_WAREHOUSE",
  SNOWFLAKE_TAG_COST_OWNER: "TAG_COST_OWNER",
  SNOWFLAKE_CREATE_SPEND_REVIEW: "READ_QUERY_HISTORY",
  SNOWFLAKE_ROLLBACK_WAREHOUSE_CONFIG: "ROLLBACK_WAREHOUSE_CONFIG",
  SNOWFLAKE_VERIFY_WAREHOUSE_STATE: "VERIFY_WAREHOUSE_STATE",
  DATABRICKS_SET_AUTO_TERMINATION: "SET_AUTO_TERMINATION",
  DATABRICKS_RESIZE_CLUSTER: "RESIZE_CLUSTER",
  DATABRICKS_TERMINATE_CLUSTER: "TERMINATE_CLUSTER",
  DATABRICKS_TAG_COST_OWNER: "TAG_COST_OWNER",
  DATABRICKS_CREATE_JOB_REVIEW: "READ_JOB_USAGE",
  DATABRICKS_ROLLBACK_CLUSTER_CONFIG: "ROLLBACK_CLUSTER_CONFIG",
  DATABRICKS_VERIFY_CLUSTER_STATE: "VERIFY_CLUSTER_STATE",
  ITAM_ASSIGN_OWNER: "ASSIGN_OWNER",
  ITAM_ASSIGN_COST_CENTRE: "ASSIGN_COST_CENTRE",
  ITAM_RECLAIM_LICENSE: "RECLAIM_LICENSE",
  ITAM_RESTORE_LICENSE: "RESTORE_LICENSE_ITAM",
  ITAM_MARK_RETIRED: "MARK_RETIRED",
  ITAM_MARK_ACTIVE: "MARK_ACTIVE",
  ITAM_CONSOLIDATE_CAPABILITY: "CONSOLIDATE_CAPABILITY",
  ITAM_CREATE_RENEWAL_REVIEW: "CREATE_RENEWAL_REVIEW",
  ITAM_VERIFY_ASSET_STATE: "VERIFY_ASSET_STATE",
  ITAM_ROLLBACK_ITAM_ACTION: "ROLLBACK_ITAM_ACTION",
};

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }
function trustSatisfied(trust: ExecutionReadinessInput["trust"], action?: ExecutionReadinessInput["action"]) {
  if (typeof trust === "boolean") return trust;
  if (typeof trust === "number") return trust > 0;
  if (typeof action?.trustScore === "number") return action.trustScore > 0;
  return false;
}
function needsApproval(action?: ExecutionReadinessInput["action"], mode?: ExecutionReadinessInput["executionMode"]) {
  return action?.readiness === "APPROVAL_REQUIRED" || mode === "APPROVAL_REQUIRED" || mode === "MANUAL";
}
function eventCategory(type: string) { return type.includes("FAILED") ? "EXECUTION" as const : "EXECUTION" as const; }

export function evaluateExecutionReadiness(input: ExecutionReadinessInput): ExecutionReadiness {
  const reasons: string[] = [];
  if (!input.connector) reasons.push("No connector available");
  else if (input.connector.status === "DISCONNECTED") reasons.push("Connector disconnected");
  else if (input.connector.status === "DEGRADED") reasons.push("Connector degraded");
  if (!trustSatisfied(input.trust, input.action)) reasons.push("No trust evidence available");
  if (needsApproval(input.action, input.executionMode) && !input.approval) reasons.push("Approval required but absent");
  const noRollbackHighBlast = (input.rollbackSupported === false || input.action?.rollbackCapability === "NONE") && input.action?.blastRadius === "HIGH";
  if (noRollbackHighBlast) reasons.push("No rollback and high blast radius");
  if (input.connector?.executionMode === "READ_ONLY") reasons.push("Connector is read-only");

  if (!input.connector || input.connector.status === "DISCONNECTED" || !trustSatisfied(input.trust, input.action)) return { verdict: "BLOCKED", reasons };
  if (input.connector.executionMode === "READ_ONLY" && input.action?.blastRadius === "HIGH") return { verdict: "NEVER_ELIGIBLE", reasons };
  if (input.connector.status === "DEGRADED" || reasons.some((reason) => reason.includes("Approval required") || reason.includes("No rollback") || reason.includes("read-only"))) return { verdict: "APPROVAL_REQUIRED", reasons };
  return { verdict: "ELIGIBLE", reasons: reasons.length ? reasons : ["Connector, trust, approval, and rollback checks passed"] };
}

export class GovernedExecutionRepository {
  private readonly connectors = new Map<string, ExecutionConnector>();
  private readonly executionStore = new PersistenceStore<GovernedExecution>(getPersistenceProvider(), PersistenceCollections.GOVERNED_EXECUTIONS);
  private readonly evidenceStore = new PersistenceStore<ExecutionEvidence & { tenantId: string; updatedAt: string }>(getPersistenceProvider(), PersistenceCollections.EXECUTION_EVIDENCE);

  registerConnector(connector: ExecutionConnector) { this.connectors.set(`${connector.tenantId}:${connector.id}`, connector); return connector; }
  seedDefaultConnectors(tenantId: string) { return ["M365", "AI", "SERVICENOW", "JIRA", "AWS", "AZURE", "SNOWFLAKE", "DATABRICKS", "ITAM", "FLEXERA"].map((connectorType) => this.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: connectorType as ExecutionConnectorType }))); }
  listConnectors(tenantId: string) {
    const rows = Array.from(this.connectors.values()).filter((connector) => connector.tenantId === tenantId);
    return rows.length ? rows : this.seedDefaultConnectors(tenantId);
  }
  getConnector(tenantId: string, connectorId: string) { return this.connectors.get(`${tenantId}:${connectorId}`) ?? null; }
  findConnectorForExecution(tenantId: string, executionType: GovernedExecutionType) {
    const capability = capabilityByExecutionType[executionType];
    return this.listConnectors(tenantId).find((connector) => !capability || connectorSupportsCapability(connector, capability)) ?? null;
  }
  async upsertExecution(execution: GovernedExecution) { return this.executionStore.upsert(execution); }
  getExecution(tenantId: string, executionId: string) { return this.executionStore.getCached(tenantId, executionId); }
  listExecutions(tenantId: string) { return this.executionStore.listCached(tenantId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async listExecutionsAsync(tenantId: string) { return (await this.executionStore.list(tenantId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  appendEvidence(execution: GovernedExecution, evidence: ExecutionEvidence): ExecutionEvidence {
    const record = { ...evidence, tenantId: execution.tenantId, updatedAt: evidence.createdAt };
    this.evidenceStore.upsert(record).catch(() => {});
    this.evidenceStore.setCached(record);
    return evidence;
  }
  listEvidence(tenantId: string, executionId: string) { return this.evidenceStore.listCached(tenantId).filter((e) => e.executionId === executionId); }
  async listEvidenceAsync(tenantId: string, executionId: string) { return this.evidenceStore.list(tenantId, { executionId }); }
  clear() { this.connectors.clear(); this.executionStore.clearAll(); this.evidenceStore.clearAll(); }
}

export class GovernedExecutionService {
  constructor(private readonly repository = new GovernedExecutionRepository()) {}
  registerConnector(connector: ExecutionConnector) { return this.repository.registerConnector(connector); }
  listConnectors(tenantId: string) { return this.repository.listConnectors(tenantId); }
  getExecution(tenantId: string, executionId: string) { return this.repository.getExecution(tenantId, executionId); }
  listExecutions(tenantId: string) { return this.repository.listExecutions(tenantId); }
  async listExecutionsAsync(tenantId: string) { return this.repository.listExecutionsAsync(tenantId); }
  appendEvidence(execution: GovernedExecution, evidence: ExecutionEvidence) { return this.repository.appendEvidence(execution, evidence); }
  updateExecution(execution: GovernedExecution) { return this.repository.upsertExecution(execution); }
  listEvidence(tenantId: string, executionId: string) { return this.repository.listEvidence(tenantId, executionId); }
  async listEvidenceAsync(tenantId: string, executionId: string) { return this.repository.listEvidenceAsync(tenantId, executionId); }
  clear() { this.repository.clear(); }

  async readiness(tenantId: string, actionId: string, connectorId?: string, executionType: GovernedExecutionType = "TICKET_CREATE", approved = false) {
    const action = await governedActionService.get(tenantId, actionId);
    const connector = connectorId ? this.repository.getConnector(tenantId, connectorId) : this.repository.findConnectorForExecution(tenantId, executionType);
    const readiness = evaluateExecutionReadiness({ action, connector, approval: approved || action?.status === "APPROVED", trust: action?.trustScore, executionMode: connector?.executionMode, rollbackSupported: action?.rollbackCapability !== "NONE" });
    await governedActionService.updateExecutionMetadata(tenantId, actionId, { executionReadiness: readiness.verdict, dryRunAvailable: readiness.verdict !== "BLOCKED" && readiness.verdict !== "NEVER_ELIGIBLE" });
    return readiness;
  }

  async simulateExecution(input: SimulateExecutionInput) {
    const action = await governedActionService.get(input.tenantId, input.actionId);
    if (!action) throw new Error("ACTION_NOT_FOUND");
    const executionType = input.executionType ?? "TICKET_CREATE";
    const connector = input.connectorId ? this.repository.getConnector(input.tenantId, input.connectorId) : this.repository.findConnectorForExecution(input.tenantId, executionType);
    const readiness = evaluateExecutionReadiness({ action, connector, approval: action.status === "APPROVED", trust: action.trustScore, executionMode: connector?.executionMode, rollbackSupported: action.rollbackCapability !== "NONE" });
    if (!connector) throw new Error("EXECUTION_CONNECTOR_REQUIRED");
    const timestamp = now();
    const execution = await this.repository.upsertExecution({ id: id("gexec"), tenantId: input.tenantId, actionId: input.actionId, connectorId: connector.id, executionType, status: "DRY_RUN", executionMode: "SIMULATION", blastRadius: action.blastRadius, rollbackSupported: action.rollbackCapability !== "NONE", executedBy: input.actor, createdAt: timestamp, updatedAt: timestamp });
    const evidence = await this.repository.appendEvidence(execution, { id: id("exevidence"), executionId: execution.id, evidenceType: "DRY_RUN", summary: `Dry run for ${executionType}: expected controlled change only; no production changes made.`, payload: { expectedChange: executionType, affectedObjects: [action.sourceId, ...action.recommendationIds], estimatedValue: input.estimatedValue ?? action.projectedAnnualValue ?? action.projectedMonthlyValue ?? 0, blastRadius: action.blastRadius, rollbackAvailable: execution.rollbackSupported, readiness }, createdAt: timestamp });
    await this.recordEvent(input.tenantId, "EXECUTION_DRY_RUN", execution, { evidenceId: evidence.id });
    await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: execution.status, latestExecutionId: execution.id, dryRunAvailable: true, evidenceIds: [evidence.id] });
    return { execution, dryRun: evidence.payload, evidence, readiness };
  }

  async executeGovernedAction(input: ExecuteGovernedActionInput) {
    const action = await governedActionService.get(input.tenantId, input.actionId);
    if (!action) throw new Error("ACTION_NOT_FOUND");
    const executionType = input.executionType ?? "TICKET_CREATE";
    if (!allowedExecutionTypes.has(executionType)) throw new Error("EXECUTION_TYPE_NOT_ALLOWED_V1");
    const connector = input.connectorId ? this.repository.getConnector(input.tenantId, input.connectorId) : this.repository.findConnectorForExecution(input.tenantId, executionType);
    const readiness = evaluateExecutionReadiness({ action, connector, approval: Boolean(input.approved) || action.status === "APPROVED", trust: action.trustScore, executionMode: connector?.executionMode, rollbackSupported: action.rollbackCapability !== "NONE" });
    if (!connector) throw new Error("EXECUTION_CONNECTOR_REQUIRED");
    const approvalPresent = await approvalAuthorityEngine.isActionApproved(input.tenantId, input.actionId) || Boolean(input.approved) || action.status === "APPROVED";
    const authority = trustReadinessAuthorityService.getReport(input.tenantId, input.actionId) ?? await evaluateReadinessAuthority(input.tenantId, input.actionId, { connectorStatus: connector.status, executionMode: connector.executionMode, executionType, rollbackSupported: action.rollbackCapability !== "NONE", approvalPresent });
    if (authority.verdict === "BLOCKED" || authority.verdict === "NEVER_ELIGIBLE") throw new Error(`READINESS_AUTHORITY_DENIED:${authority.verdict}`);
    const approvalReport = await approvalAuthorityEngine.evaluateApprovalAuthority(input.tenantId, input.actionId, { executionType });
    const approvalGranted = approvalReport.verdict === "APPROVAL_NOT_REQUIRED" || approvalReport.verdict === "APPROVED" || await approvalAuthorityEngine.isActionApproved(input.tenantId, input.actionId);
    if ((authority.verdict === "APPROVAL_REQUIRED" || action.readiness === "APPROVAL_REQUIRED" || readiness.verdict === "APPROVAL_REQUIRED") && !approvalGranted) throw new Error("APPROVAL_AUTHORITY_REQUIRED");
    if (readiness.verdict === "BLOCKED" || readiness.verdict === "NEVER_ELIGIBLE") throw new Error(`EXECUTION_NOT_READY:${readiness.verdict}`);
    if (readiness.verdict === "APPROVAL_REQUIRED" && !approvalGranted) throw new Error("EXECUTION_APPROVAL_REQUIRED");
    const liveDomain = connector.connectorType === "SERVICENOW" ? "SERVICENOW" : connector.connectorType === "M365" ? "M365" : connector.connectorType === "AI" ? "AI" : connector.connectorType === "AWS" ? "AWS" : connector.connectorType === "AZURE" ? "AZURE" : connector.connectorType === "SNOWFLAKE" ? "SNOWFLAKE" : connector.connectorType === "DATABRICKS" ? "DATABRICKS" : connector.connectorType === "ITAM" || connector.connectorType === "FLEXERA" ? "ITAM" : undefined;
    if (liveDomain && !input.dryRun) assertLiveTenantExecutionAllowed({ policy: getTenantExecutionPolicy(input.tenantId), action, trustAuthorityReport: authority, approvalAuthorityReport: approvalReport, connector, connectorHealth: getConnectorHealth(input.tenantId, connector.id), request: { tenantId: input.tenantId, domain: liveDomain, executionMode: input.executionMode ?? "CONTROLLED", dryRun: Boolean(input.dryRun), destructive: action.rollbackCapability !== "NONE", blastRadius: action.blastRadius } });
    else if (liveDomain) evaluateLiveTenantExecutionGate({ policy: getTenantExecutionPolicy(input.tenantId), action, trustAuthorityReport: authority, approvalAuthorityReport: approvalReport, connector, connectorHealth: getConnectorHealth(input.tenantId, connector.id), request: { tenantId: input.tenantId, domain: liveDomain, executionMode: "SIMULATION", dryRun: true, destructive: false, blastRadius: action.blastRadius } });
    const timestamp = now();
    const execution = await this.repository.upsertExecution({ id: id("gexec"), tenantId: input.tenantId, actionId: input.actionId, connectorId: connector.id, executionType, status: "EXECUTING", executionMode: input.executionMode ?? "CONTROLLED", blastRadius: action.blastRadius, rollbackSupported: action.rollbackCapability !== "NONE", executedBy: input.actor, createdAt: timestamp, updatedAt: timestamp });
    await this.recordEvent(input.tenantId, "EXECUTION_PLANNED", execution);
    await this.recordEvent(input.tenantId, "EXECUTION_STARTED", execution);
    if (connector.connectorType === "M365" && (executionType.includes("M365") || executionType.includes("COPILOT") || executionType === "DOWNGRADE_M365_LICENSE" || executionType === "CONVERT_SHARED_MAILBOX_REVIEW")) {
      const graph = await executeM365GraphOperation({ tenantId: input.tenantId, action, execution, executionType, userId: input.userId ?? action.sourceId, skuId: input.skuId, targetSkuId: input.targetSkuId, dryRun: Boolean(input.dryRun), approvalPresent: approvalGranted, readinessVerdict: authority.verdict, connector });
      const completed = await this.repository.upsertExecution({ ...execution, status: graph.status, updatedAt: now() });
      for (const evidence of graph.evidence) await this.repository.appendEvidence(completed, evidence);
      await this.recordEvent(input.tenantId, graph.status === "COMPLETED" ? "EXECUTION_COMPLETED" : "EXECUTION_FAILED", completed, { evidenceIds: graph.evidence.map((e) => e.id) });
      await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: graph.evidence.map((e) => e.id) });
      return { execution: completed, evidence: graph.evidence, readiness, rollbackPayload: graph.rollbackPayload };
    }
    if (connector.connectorType === "AI" && ["APPROVE_AI_ASSET", "RETIRE_AI_ASSET", "ASSIGN_AI_OWNER", "ENFORCE_AI_POLICY", "DISABLE_AI_ASSET", "ENABLE_AI_ASSET"].includes(executionType)) {
      const provider = await executeAIProviderOperation({ tenantId: input.tenantId, action, execution, executionType, assetId: action.sourceId, ownerId: input.ownerId ?? action.ownerId, policyId: input.policyId, dryRun: Boolean(input.dryRun), approvalPresent: approvalGranted, readinessVerdict: authority.verdict, connector });
      const completed = await this.repository.upsertExecution({ ...execution, status: provider.status, updatedAt: now() });
      for (const evidence of provider.evidence) await this.repository.appendEvidence(completed, evidence);
      await this.recordEvent(input.tenantId, provider.status === "COMPLETED" ? "EXECUTION_COMPLETED" : "EXECUTION_FAILED", completed, { evidenceIds: provider.evidence.map((e) => e.id) });
      await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: provider.evidence.map((e) => e.id) });
      return { execution: completed, evidence: provider.evidence, readiness, rollbackPayload: provider.rollbackPayload };
    }
    if (connector.connectorType === "AWS" && executionType.startsWith("AWS_")) {
      const aws = await executeAwsOperation({ tenantId: input.tenantId, action, execution, executionType, dryRun: Boolean(input.dryRun), approvalPresent: approvalGranted, readinessVerdict: authority.verdict, connector, ownerId: input.ownerId });
      const completed = await this.repository.upsertExecution({ ...execution, status: aws.status, updatedAt: now() });
      for (const evidence of aws.evidence) await this.repository.appendEvidence(completed, evidence);
      await this.recordEvent(input.tenantId, aws.status === "COMPLETED" ? "EXECUTION_COMPLETED" : "EXECUTION_FAILED", completed, { evidenceIds: aws.evidence.map((e) => e.id), artifactId: aws.artifact?.id });
      await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: aws.evidence.map((e) => e.id) });
      return { execution: completed, evidence: aws.evidence, readiness, rollbackPayload: aws.rollbackPayload, artifact: aws.artifact };
    }
    if (connector.connectorType === "AZURE" && executionType.startsWith("AZURE_")) {
      const azure = await executeAzureOperation({ tenantId: input.tenantId, action, execution, executionType, dryRun: Boolean(input.dryRun), approvalPresent: approvalGranted, readinessVerdict: authority.verdict, connector, ownerId: input.ownerId });
      const completed = await this.repository.upsertExecution({ ...execution, status: azure.status, updatedAt: now() });
      for (const evidence of azure.evidence) await this.repository.appendEvidence(completed, evidence);
      await this.recordEvent(input.tenantId, azure.status === "COMPLETED" ? "EXECUTION_COMPLETED" : "EXECUTION_FAILED", completed, { evidenceIds: azure.evidence.map((e) => e.id), artifactId: azure.artifact?.id });
      await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: azure.evidence.map((e) => e.id) });
      return { execution: completed, evidence: azure.evidence, readiness, rollbackPayload: azure.rollbackPayload, artifact: azure.artifact };
    }
    if (connector.connectorType === "SNOWFLAKE" && executionType.startsWith("SNOWFLAKE_")) {
      const snowflake = await executeSnowflakeOperation({ tenantId: input.tenantId, action, execution, executionType, dryRun: Boolean(input.dryRun), approvalPresent: approvalGranted, readinessVerdict: authority.verdict, connector, ownerId: input.ownerId });
      const completed = await this.repository.upsertExecution({ ...execution, status: snowflake.status, updatedAt: now() });
      for (const evidence of snowflake.evidence) await this.repository.appendEvidence(completed, evidence);
      await this.recordEvent(input.tenantId, snowflake.status === "COMPLETED" ? "EXECUTION_COMPLETED" : "EXECUTION_FAILED", completed, { evidenceIds: snowflake.evidence.map((e) => e.id), artifactId: snowflake.artifact?.id });
      await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: snowflake.evidence.map((e) => e.id) });
      return { execution: completed, evidence: snowflake.evidence, readiness, rollbackPayload: snowflake.rollbackPayload, artifact: snowflake.artifact };
    }
    if (connector.connectorType === "DATABRICKS" && executionType.startsWith("DATABRICKS_")) {
      const databricks = await executeDatabricksOperation({ tenantId: input.tenantId, action, execution, executionType, dryRun: Boolean(input.dryRun), approvalPresent: approvalGranted, readinessVerdict: authority.verdict, connector, ownerId: input.ownerId });
      const completed = await this.repository.upsertExecution({ ...execution, status: databricks.status, updatedAt: now() });
      for (const evidence of databricks.evidence) await this.repository.appendEvidence(completed, evidence);
      await this.recordEvent(input.tenantId, databricks.status === "COMPLETED" ? "EXECUTION_COMPLETED" : "EXECUTION_FAILED", completed, { evidenceIds: databricks.evidence.map((e) => e.id), artifactId: databricks.artifact?.id });
      await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: databricks.evidence.map((e) => e.id) });
      return { execution: completed, evidence: databricks.evidence, readiness, rollbackPayload: databricks.rollbackPayload, artifact: databricks.artifact };
    }
    if ((connector.connectorType === "ITAM" || connector.connectorType === "FLEXERA") && executionType.startsWith("ITAM_")) {
      const itam = await executeItamOperation({ tenantId: input.tenantId, action, execution, executionType, dryRun: Boolean(input.dryRun), approvalPresent: approvalGranted, readinessVerdict: authority.verdict, connector, ownerId: input.ownerId });
      const completed = await this.repository.upsertExecution({ ...execution, status: itam.status, updatedAt: now() });
      for (const evidence of itam.evidence) await this.repository.appendEvidence(completed, evidence);
      await this.recordEvent(input.tenantId, itam.status === "COMPLETED" ? "EXECUTION_COMPLETED" : "EXECUTION_FAILED", completed, { evidenceIds: itam.evidence.map((e) => e.id) });
      await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: itam.evidence.map((e) => e.id) });
      return { execution: completed, evidence: itam.evidence, readiness, rollbackPayload: itam.rollbackPayload };
    }
    if (connector.connectorType === "SERVICENOW" && ["CREATE_SERVICENOW_CHANGE", "UPDATE_SERVICENOW_CHANGE", "CLOSE_SERVICENOW_CHANGE", "CREATE_SERVICENOW_TASK", "UPDATE_SERVICENOW_TASK", "CLOSE_SERVICENOW_TASK", "CREATE_SERVICENOW_APPROVAL", "UPDATE_SERVICENOW_APPROVAL", "WITHDRAW_SERVICENOW_APPROVAL", "VERIFY_SERVICENOW_ARTIFACT"].includes(executionType)) {
      const serviceNow = await executeServiceNowOperation({ tenantId: input.tenantId, action, execution, executionType, dryRun: Boolean(input.dryRun), approvalPresent: approvalGranted, readinessVerdict: authority.verdict, connector, artifactType: input.artifactType, expectedState: input.expectedState as any, assignedTo: input.assignedTo, approvalGroup: input.approvalGroup });
      const completed = await this.repository.upsertExecution({ ...execution, status: serviceNow.status, updatedAt: now() });
      for (const evidence of serviceNow.evidence) await this.repository.appendEvidence(completed, evidence);
      await this.recordEvent(input.tenantId, serviceNow.status === "COMPLETED" ? "EXECUTION_COMPLETED" : "EXECUTION_FAILED", completed, { evidenceIds: serviceNow.evidence.map((e) => e.id), artifactId: serviceNow.artifact?.id });
      await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: serviceNow.evidence.map((e) => e.id) });
      return { execution: completed, evidence: serviceNow.evidence, readiness, rollbackPayload: serviceNow.rollbackPayload, artifact: serviceNow.artifact };
    }
    const preState = await this.repository.appendEvidence(execution, { id: id("exevidence"), executionId: execution.id, evidenceType: "PRE_STATE", summary: "Pre-state captured before governed execution.", payload: { actionStatus: action.status, sourceId: action.sourceId, evidenceIds: action.evidenceIds }, createdAt: timestamp });
    const result = await this.repository.appendEvidence(execution, { id: id("exevidence"), executionId: execution.id, evidenceType: "EXECUTION_RESULT", summary: `Controlled execution completed for ${executionType}.`, payload: { destructive: false, autonomous: false, permissioned: true }, createdAt: now() });
    const postState = await this.repository.appendEvidence(execution, { id: id("exevidence"), executionId: execution.id, evidenceType: "POST_STATE", summary: "Post-state captured after governed execution.", payload: { actionStatus: "EXECUTED", connectorId: connector.id, outcomeEligible: true }, createdAt: now() });
    const completed = await this.repository.upsertExecution({ ...execution, status: "COMPLETED", updatedAt: now() });
    await this.recordEvent(input.tenantId, "EXECUTION_COMPLETED", completed, { evidenceIds: [preState.id, result.id, postState.id] });
    await governedActionService.updateExecutionMetadata(input.tenantId, input.actionId, { executionReadiness: readiness.verdict, executionStatus: completed.status, latestExecutionId: completed.id, dryRunAvailable: true, evidenceIds: [preState.id, result.id, postState.id] });
    return { execution: completed, evidence: [preState, result, postState], readiness };
  }

  private recordEvent(tenantId: string, type: string, execution: GovernedExecution, metadata: Record<string, unknown> = {}) {
    return platformEventService.recordEvent({ tenantId, category: eventCategory(type), type, entityType: "GovernedExecution", entityId: execution.id, actorId: execution.executedBy, sourceSystem: "governed-execution-engine", metadata: { ...metadata, actionId: execution.actionId, executionType: execution.executionType, status: execution.status, autonomous: false } });
  }
}

export const governedExecutionService = new GovernedExecutionService();
export const simulateExecution = (input: SimulateExecutionInput) => governedExecutionService.simulateExecution(input);
export const executeGovernedAction = (input: ExecuteGovernedActionInput) => governedExecutionService.executeGovernedAction(input);
