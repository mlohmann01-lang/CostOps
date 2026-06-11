import { governedActionService, type GovernedAction } from "../../actions/governed-actions";
import { governedExecutionService, type GovernedExecutionType } from "../../execution/governed-execution";
import { connectorSupportsCapability } from "../../execution/execution-connectors";
import { economicOutcomeAttributionService } from "../../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../../outcome-protection/outcome-protection";
import { listServiceNowArtifacts } from "./servicenow-execution";

export type ServiceNowPlaybookExecution = "REAL_SERVICENOW_EXECUTION" | "CONTROLLED_EXECUTION" | "SIMULATED_ONLY" | "NOT_IMPLEMENTED";
export type ServiceNowStatus = "COMPLETE" | "MISSING";
export type ServiceNowRollbackStatus = "COMPLETE" | "MISSING" | "NOT_APPLICABLE";
export type ServiceNowPlaybookCertification = { playbookId: string; name: string; discovery: ServiceNowStatus; trust: ServiceNowStatus; approval: ServiceNowStatus; execution: ServiceNowPlaybookExecution; rollback: ServiceNowRollbackStatus; verification: ServiceNowStatus; outcome: ServiceNowStatus; protection: ServiceNowStatus; drift: ServiceNowStatus; executiveProof: ServiceNowStatus; certified: boolean; blockers: string[] };

const playbooks: Array<{ playbookId: string; name: string; terms: string[]; executionTypes: GovernedExecutionType[]; capabilities: string[] }> = [
  { playbookId: "servicenow-change-request-creation", name: "Change Request Creation", terms: ["change", "request", "creation", "chg"], executionTypes: ["CREATE_SERVICENOW_CHANGE"], capabilities: ["CREATE_CHANGE", "READ_CHANGE", "VERIFY_STATE"] },
  { playbookId: "servicenow-approval-workflow", name: "Approval Workflow", terms: ["approval", "workflow"], executionTypes: ["CREATE_SERVICENOW_APPROVAL", "UPDATE_SERVICENOW_APPROVAL", "WITHDRAW_SERVICENOW_APPROVAL"], capabilities: ["CREATE_APPROVAL", "READ_APPROVAL", "UPDATE_APPROVAL", "WITHDRAW_APPROVAL", "VERIFY_STATE"] },
  { playbookId: "servicenow-remediation-task", name: "Remediation Task", terms: ["remediation", "task"], executionTypes: ["CREATE_SERVICENOW_TASK", "UPDATE_SERVICENOW_TASK", "CLOSE_SERVICENOW_TASK"], capabilities: ["CREATE_TASK", "READ_TASK", "UPDATE_TASK", "CLOSE_TASK", "VERIFY_STATE"] },
  { playbookId: "servicenow-drift-remediation", name: "Drift Remediation", terms: ["drift", "remediation"], executionTypes: ["CREATE_SERVICENOW_TASK", "UPDATE_SERVICENOW_TASK", "CLOSE_SERVICENOW_TASK", "CREATE_SERVICENOW_CHANGE"], capabilities: ["CREATE_TASK", "READ_TASK", "UPDATE_TASK", "CLOSE_TASK", "CREATE_CHANGE", "READ_CHANGE", "VERIFY_STATE"] },
];
function complete(value: boolean): ServiceNowStatus { return value ? "COMPLETE" : "MISSING"; }
function matches(action: GovernedAction, playbook: typeof playbooks[number]) { const haystack = [action.id, action.title, action.description, action.sourceId, ...action.recommendationIds, ...action.evidenceIds].join(" ").toLowerCase(); return haystack.includes(playbook.playbookId) || playbook.terms.every((term) => haystack.includes(term)); }
function blockers(row: Omit<ServiceNowPlaybookCertification, "blockers" | "certified">, missingCapabilities: string[]) { const out: string[] = []; if (row.discovery !== "COMPLETE") out.push("Discovery evidence missing"); if (row.trust !== "COMPLETE") out.push("Trust evidence missing"); if (row.approval !== "COMPLETE") out.push("Approval evidence missing"); if (!["CONTROLLED_EXECUTION", "REAL_SERVICENOW_EXECUTION"].includes(row.execution)) out.push(`Execution is ${row.execution}`); if (row.rollback === "MISSING") out.push("Rollback payload/evidence missing"); if (row.verification !== "COMPLETE") out.push("Verification evidence missing"); if (row.outcome !== "COMPLETE") out.push("Economic outcome missing"); if (row.protection !== "COMPLETE") out.push("Protected outcome missing"); if (row.drift !== "COMPLETE") out.push("Drift monitoring policy missing"); if (row.executiveProof !== "COMPLETE") out.push("Executive proof pack evidence missing"); if (missingCapabilities.length) out.push(`Missing ServiceNow capabilities: ${missingCapabilities.join(",")}`); return out; }

export async function getServiceNowWedgeCertification(tenantId: string) {
  const actions = await governedActionService.list(tenantId);
  const executions = governedExecutionService.listExecutions(tenantId);
  const connectors = governedExecutionService.listConnectors(tenantId).filter((connector) => connector.connectorType === "SERVICENOW" && connector.status === "CONNECTED");
  const outcomes = economicOutcomeAttributionService.listEconomicOutcomes(tenantId, { assetType: "OTHER" });
  const protectedOutcomes = outcomeProtectionService.listProtectedOutcomes(tenantId, { assetType: "OTHER" });
  const artifacts = listServiceNowArtifacts(tenantId);
  const playbookStatus = playbooks.map<ServiceNowPlaybookCertification>((playbook) => {
    const playbookActions = actions.filter((action) => matches(action, playbook));
    const executionRows = executions.filter((execution) => playbook.executionTypes.includes(execution.executionType) && playbookActions.some((action) => action.id === execution.actionId));
    const evidence = executionRows.flatMap((execution) => governedExecutionService.listEvidence(tenantId, execution.id));
    const missingCapabilities = playbook.capabilities.filter((capability) => !connectors.some((connector) => connectorSupportsCapability(connector, capability)));
    const linkedOutcomeIds = new Set(playbookActions.flatMap((action) => action.outcomeIds));
    const linkedArtifacts = artifacts.filter((artifact) => playbookActions.some((action) => action.id === artifact.actionId));
    const linkedOutcomes = outcomes.filter((outcome) => linkedOutcomeIds.has(outcome.id) || linkedArtifacts.some((artifact) => artifact.id === outcome.assetId));
    const linkedProtected = protectedOutcomes.filter((outcome) => linkedOutcomeIds.has(outcome.outcomeId) || playbookActions.some((action) => action.id === outcome.actionId) || linkedArtifacts.some((artifact) => artifact.id === outcome.assetId));
    const base = { playbookId: playbook.playbookId, name: playbook.name, discovery: complete(playbookActions.some((action) => action.evidenceIds.some((id) => /discover|recommendation|servicenow/i.test(id)))), trust: complete(playbookActions.some((action) => (action.trustScore ?? 0) > 0 && action.evidenceIds.some((id) => /trust|readiness|identity|usage|financial/i.test(id)))), approval: complete(playbookActions.some((action) => ["APPROVED", "VERIFIED", "RETAINED"].includes(action.status) || action.evidenceIds.some((id) => /approval/i.test(id)))), execution: executionRows.some((row) => row.executionMode === "CONTROLLED" && row.status === "COMPLETED") && missingCapabilities.length === 0 ? "CONTROLLED_EXECUTION" as const : executionRows.some((row) => row.executionMode === "SIMULATION" || row.status === "DRY_RUN") ? "SIMULATED_ONLY" as const : "NOT_IMPLEMENTED" as const, rollback: evidence.some((row) => row.evidenceType === "ROLLBACK_PAYLOAD" || row.evidenceType === "ROLLBACK_RESULT") ? "COMPLETE" as const : "MISSING" as const, verification: complete(evidence.some((row) => row.evidenceType === "VERIFICATION_RESULT" && String(row.summary).toLowerCase().includes("passed"))), outcome: complete(linkedOutcomes.length > 0), protection: complete(linkedProtected.length > 0), drift: complete(linkedProtected.some((outcome) => outcome.policyIds.length > 0 && outcome.nextCheckAt)), executiveProof: complete(evidence.some((row) => row.evidenceType === "PRE_STATE") && evidence.some((row) => row.evidenceType === "POST_STATE") && evidence.some((row) => row.evidenceType === "VERIFICATION_RESULT") && linkedProtected.length > 0) };
    const playbookBlockers = blockers(base, missingCapabilities);
    return { ...base, certified: playbookBlockers.length === 0, blockers: playbookBlockers };
  });
  return { certified: playbookStatus.every((row) => row.certified), playbooks: playbookStatus, certifiedPlaybooks: playbookStatus.filter((row) => row.certified).length, uncertifiedPlaybooks: playbookStatus.filter((row) => !row.certified).length };
}
