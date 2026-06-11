import { governedActionService, type GovernedAction } from "../../actions/governed-actions";
import { governedExecutionService, type GovernedExecutionType } from "../../execution/governed-execution";
import { connectorSupportsCapability } from "../../execution/execution-connectors";
import { economicOutcomeAttributionService } from "../../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../../outcome-protection/outcome-protection";
import { listAwsArtifacts } from "./aws-artifacts";

export type AwsExecutionClassification = "REAL_PROVIDER_EXECUTION" | "CONTROLLED_EXECUTION" | "SIMULATED_ONLY" | "NOT_IMPLEMENTED";
export type AwsCertificationStatus = "COMPLETE" | "MISSING";
export type AwsRollbackStatus = "COMPLETE" | "MISSING" | "PARTIAL" | "NOT_APPLICABLE";
export type AwsPlaybookCertification = {
  playbookId: string;
  name: string;
  discovery: AwsCertificationStatus;
  trust: AwsCertificationStatus;
  approval: AwsCertificationStatus;
  execution: AwsExecutionClassification;
  rollback: AwsRollbackStatus;
  verification: AwsCertificationStatus;
  outcome: AwsCertificationStatus;
  protection: AwsCertificationStatus;
  drift: AwsCertificationStatus;
  executiveProof: AwsCertificationStatus;
  certified: boolean;
  blockers: string[];
};

const playbooks = [
  { playbookId: "aws-ec2-rightsizing", name: "EC2 Rightsizing", terms: ["ec2", "right"], executionTypes: ["AWS_RIGHTSIZE_EC2"], capabilities: ["READ_EC2", "MODIFY_EC2", "VERIFY_RESOURCE_STATE", "ROLLBACK_RESOURCE"] },
  { playbookId: "aws-idle-resource-shutdown", name: "Idle Resource Shutdown", terms: ["idle", "shutdown"], executionTypes: ["AWS_STOP_EC2", "AWS_STOP_RDS"], capabilities: ["READ_EC2", "STOP_EC2", "START_EC2", "READ_RDS", "STOP_RDS", "START_RDS", "VERIFY_RESOURCE_STATE", "ROLLBACK_RESOURCE"] },
  { playbookId: "aws-savings-plans-coverage", name: "Savings Plans Coverage", terms: ["savings", "plan"], executionTypes: ["AWS_CREATE_SAVINGS_PLAN_REVIEW"], capabilities: ["READ_COST_EXPLORER", "READ_CUR", "VERIFY_RESOURCE_STATE"] },
  { playbookId: "aws-reserved-instance-optimisation", name: "Reserved Instance Optimisation", terms: ["reserved", "instance"], executionTypes: ["AWS_CREATE_RI_REVIEW"], capabilities: ["READ_COST_EXPLORER", "READ_CUR", "VERIFY_RESOURCE_STATE"] },
  { playbookId: "aws-orphaned-resource-cleanup", name: "Orphaned Resource Cleanup", terms: ["orphaned", "cleanup"], executionTypes: ["AWS_DELETE_EBS", "AWS_RELEASE_EIP"], capabilities: ["READ_EBS", "DELETE_EBS", "READ_EIP", "RELEASE_EIP", "VERIFY_RESOURCE_STATE", "ROLLBACK_RESOURCE"] },
] as const;

function complete(value: boolean): AwsCertificationStatus { return value ? "COMPLETE" : "MISSING"; }
function matches(action: GovernedAction, playbook: typeof playbooks[number]) {
  const haystack = [action.id, action.title, action.description, action.sourceId, ...action.recommendationIds, ...action.evidenceIds].join(" ").toLowerCase();
  return haystack.includes(playbook.playbookId) || playbook.terms.every((term) => haystack.includes(term));
}
function blockers(row: Omit<AwsPlaybookCertification, "blockers" | "certified">, missingCapabilities: string[], partialAllowed: boolean) {
  const out: string[] = [];
  if (row.discovery !== "COMPLETE") out.push("Discovery evidence missing");
  if (row.trust !== "COMPLETE") out.push("Trust Authority evidence missing");
  if (row.approval !== "COMPLETE") out.push("Approval Authority evidence missing");
  if (!["CONTROLLED_EXECUTION", "REAL_PROVIDER_EXECUTION"].includes(row.execution)) out.push(`Execution is ${row.execution}`);
  if (row.rollback === "MISSING" || (row.rollback === "PARTIAL" && !partialAllowed)) out.push("Rollback evidence missing or unjustified");
  if (row.verification !== "COMPLETE") out.push("Verification evidence missing");
  if (row.outcome !== "COMPLETE") out.push("Economic outcome missing");
  if (row.protection !== "COMPLETE") out.push("Protected outcome missing");
  if (row.drift !== "COMPLETE") out.push("Drift monitoring missing");
  if (row.executiveProof !== "COMPLETE") out.push("Executive proof missing");
  if (missingCapabilities.length) out.push(`Missing AWS capabilities: ${missingCapabilities.join(",")}`);
  return out;
}

export async function getAwsWedgeCertification(tenantId: string) {
  const actions = await governedActionService.list(tenantId);
  const executions = governedExecutionService.listExecutions(tenantId);
  const connectors = governedExecutionService.listConnectors(tenantId).filter((connector) => connector.connectorType === "AWS" && connector.status === "CONNECTED");
  const artifacts = listAwsArtifacts(tenantId);
  const outcomes = economicOutcomeAttributionService.listEconomicOutcomes(tenantId, { assetType: "CLOUD" });
  const protectedOutcomes = outcomeProtectionService.listProtectedOutcomes(tenantId, { assetType: "CLOUD" });
  const playbookStatus = playbooks.map<AwsPlaybookCertification>((playbook) => {
    const playbookActions = actions.filter((action) => matches(action, playbook));
    const executionRows = executions.filter((execution) => playbook.executionTypes.includes(execution.executionType as never) && playbookActions.some((action) => action.id === execution.actionId));
    const evidence = executionRows.flatMap((execution) => governedExecutionService.listEvidence(tenantId, execution.id));
    const missingCapabilities = playbook.capabilities.filter((capability) => !connectors.some((connector) => connectorSupportsCapability(connector, capability)));
    const linkedArtifacts = artifacts.filter((artifact) => playbookActions.some((action) => action.id === artifact.actionId));
    const linkedOutcomeIds = new Set(playbookActions.flatMap((action) => action.outcomeIds));
    const linkedOutcomes = outcomes.filter((outcome) => linkedOutcomeIds.has(outcome.id) || linkedArtifacts.some((artifact) => artifact.id === outcome.assetId));
    const linkedProtected = protectedOutcomes.filter((outcome) => linkedOutcomeIds.has(outcome.outcomeId) || playbookActions.some((action) => action.id === outcome.actionId) || linkedArtifacts.some((artifact) => artifact.id === outcome.assetId));
    const destructivePartial = playbook.executionTypes.some((type) => type === "AWS_DELETE_EBS" || type === "AWS_RELEASE_EIP");
    const hasRollbackPayload = evidence.some((row) => row.evidenceType === "ROLLBACK_PAYLOAD");
    const hasPartialEvidence = evidence.some((row) => row.evidenceType === "ROLLBACK_RESULT" && /PARTIAL/i.test(row.summary));
    const rollback: AwsRollbackStatus = hasRollbackPayload ? destructivePartial ? "PARTIAL" : "COMPLETE" : "MISSING";
    const base = {
      playbookId: playbook.playbookId,
      name: playbook.name,
      discovery: complete(playbookActions.some((action) => action.evidenceIds.some((id) => /discover|recommendation|aws/i.test(id)))),
      trust: complete(playbookActions.some((action) => (action.trustScore ?? 0) > 0 && action.evidenceIds.some((id) => /trust|readiness|identity|usage|financial/i.test(id)))),
      approval: complete(playbookActions.some((action) => ["APPROVED", "VERIFIED", "RETAINED"].includes(action.status) || action.evidenceIds.some((id) => /approval/i.test(id)))),
      execution: executionRows.some((row) => row.executionMode === "CONTROLLED" && row.status === "COMPLETED" && missingCapabilities.length === 0) ? "CONTROLLED_EXECUTION" as const : executionRows.some((row) => row.executionMode === "SIMULATION" || row.status === "DRY_RUN") ? "SIMULATED_ONLY" as const : "NOT_IMPLEMENTED" as const,
      rollback,
      verification: complete(evidence.some((row) => row.evidenceType === "VERIFICATION_RESULT" && /passed/i.test(row.summary))),
      outcome: complete(linkedOutcomes.length > 0),
      protection: complete(linkedProtected.length > 0),
      drift: complete(linkedProtected.some((outcome) => outcome.policyIds.length > 0 && outcome.nextCheckAt)),
      executiveProof: complete(evidence.some((row) => row.evidenceType === "PRE_STATE") && evidence.some((row) => row.evidenceType === "POST_STATE") && evidence.some((row) => row.evidenceType === "VERIFICATION_RESULT") && linkedProtected.length > 0),
    };
    const playbookBlockers = blockers(base, missingCapabilities, !destructivePartial || hasPartialEvidence || hasRollbackPayload);
    return { ...base, certified: playbookBlockers.length === 0, blockers: playbookBlockers };
  });
  return { certified: playbookStatus.every((row) => row.certified), playbooks: playbookStatus, certifiedPlaybooks: playbookStatus.filter((row) => row.certified).length, uncertifiedPlaybooks: playbookStatus.filter((row) => !row.certified).length };
}
