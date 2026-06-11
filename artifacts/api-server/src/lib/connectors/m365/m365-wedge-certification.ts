import { governedActionService, type GovernedAction } from "../../actions/governed-actions";
import { governedExecutionService } from "../../execution/governed-execution";
import { economicOutcomeAttributionService } from "../../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../../outcome-protection/outcome-protection";

export type M365PlaybookExecutionCertification = "REAL_GRAPH_EXECUTION" | "CONTROLLED_EXECUTION" | "SIMULATED_ONLY" | "NOT_IMPLEMENTED";
export type M365LifecycleStatus = "COMPLETE" | "MISSING";
export type M365RollbackStatus = "COMPLETE" | "MISSING" | "NOT_APPLICABLE";
export type M365PlaybookCertification = {
  playbookId: string;
  name: string;
  discovery: M365LifecycleStatus;
  trust: M365LifecycleStatus;
  approval: M365LifecycleStatus;
  execution: M365PlaybookExecutionCertification;
  rollback: M365RollbackStatus;
  verification: M365LifecycleStatus;
  outcome: M365LifecycleStatus;
  protection: M365LifecycleStatus;
  drift: M365LifecycleStatus;
  executiveProof: M365LifecycleStatus;
  certified: boolean;
  blockers: string[];
};

const playbooks = [
  { playbookId: "inactive-user-licence-reclaim", name: "Inactive User Licence Reclaim", terms: ["inactive", "user", "reclaim"], rollbackRequired: true },
  { playbookId: "copilot-licence-reclaim", name: "Copilot Licence Reclaim", terms: ["copilot", "reclaim"], rollbackRequired: true },
  { playbookId: "duplicate-licence-cleanup", name: "Duplicate Licence Cleanup", terms: ["duplicate", "licence", "license", "cleanup"], rollbackRequired: true },
  { playbookId: "e5-rightsizing", name: "E5 Rightsizing", terms: ["e5", "rightsiz"], rollbackRequired: true },
  { playbookId: "shared-mailbox-licence-review", name: "Shared Mailbox Licence Review", terms: ["shared", "mailbox", "review"], rollbackRequired: false },
];

function hasTerm(action: GovernedAction, terms: string[]) {
  const haystack = [action.id, action.title, action.description, action.sourceId, ...action.recommendationIds, ...action.evidenceIds].join(" ").toLowerCase();
  const [playbookId, ...rest] = terms;
  return haystack.includes(playbookId) || rest.filter((term) => haystack.includes(term)).length >= Math.max(1, Math.ceil(rest.length * 0.75));
}
function complete(value: boolean): M365LifecycleStatus { return value ? "COMPLETE" : "MISSING"; }
function blockersFor(row: Omit<M365PlaybookCertification, "blockers" | "certified">) {
  const blockers: string[] = [];
  if (row.discovery !== "COMPLETE") blockers.push("Discovery evidence missing");
  if (row.trust !== "COMPLETE") blockers.push("Trust evidence missing");
  if (row.approval !== "COMPLETE") blockers.push("Approval evidence missing");
  if (!["CONTROLLED_EXECUTION", "REAL_GRAPH_EXECUTION"].includes(row.execution)) blockers.push(`Execution is ${row.execution}`);
  if (row.rollback === "MISSING") blockers.push("Rollback payload/evidence missing");
  if (row.verification !== "COMPLETE") blockers.push("Verification evidence missing");
  if (row.outcome !== "COMPLETE") blockers.push("Economic outcome missing");
  if (row.protection !== "COMPLETE") blockers.push("Protected outcome missing");
  if (row.drift !== "COMPLETE") blockers.push("Drift monitoring policy missing");
  if (row.executiveProof !== "COMPLETE") blockers.push("Executive proof pack evidence missing");
  return blockers;
}

export function getM365WedgeCertification(tenantId: string) {
  const actions = (governedActionService as any).repository ? [] : [];
  void actions;
  return Promise.resolve(buildM365WedgeCertification(tenantId));
}

export async function buildM365WedgeCertification(tenantId: string) {
  const allActions = await governedActionService.list(tenantId);
  const executions = governedExecutionService.listExecutions(tenantId);
  const outcomes = economicOutcomeAttributionService.listEconomicOutcomes(tenantId, { assetType: "M365" });
  const protectedOutcomes = outcomeProtectionService.listProtectedOutcomes(tenantId, { assetType: "M365" });
  const playbookStatus: M365PlaybookCertification[] = [];
  for (const playbook of playbooks) {
    const playbookActions = allActions.filter((action) => action.domain === "M365" && hasTerm(action, [playbook.playbookId, ...playbook.terms]));
    const executionRows = executions.filter((execution) => playbookActions.some((action) => action.id === execution.actionId));
    const evidence = executionRows.flatMap((execution) => governedExecutionService.listEvidence(tenantId, execution.id));
    const execution: M365PlaybookExecutionCertification = executionRows.some((row) => row.executionMode === "CONTROLLED" && row.status === "COMPLETED") ? "CONTROLLED_EXECUTION" : executionRows.some((row) => row.executionMode === "SIMULATION" || row.status === "DRY_RUN") ? "SIMULATED_ONLY" : "NOT_IMPLEMENTED";
    const linkedOutcomeIds = new Set(playbookActions.flatMap((action) => action.outcomeIds));
    const linkedOutcomes = outcomes.filter((outcome) => linkedOutcomeIds.has(outcome.id) || playbookActions.some((action) => outcome.assetId === action.sourceId));
    const linkedProtected = protectedOutcomes.filter((outcome) => linkedOutcomeIds.has(outcome.outcomeId) || playbookActions.some((action) => outcome.actionId === action.id));
    const base = {
      playbookId: playbook.playbookId,
      name: playbook.name,
      discovery: complete(playbookActions.length > 0 && playbookActions.some((action) => action.evidenceIds.some((id) => id.toLowerCase().includes("discover") || id.toLowerCase().includes("rec")))),
      trust: complete(playbookActions.some((action) => (action.trustScore ?? 0) > 0 && action.evidenceIds.some((id) => id.toLowerCase().includes("trust") || id.toLowerCase().includes("readiness")))),
      approval: complete(playbookActions.some((action) => action.status === "APPROVED" || action.status === "VERIFIED" || action.evidenceIds.some((id) => id.toLowerCase().includes("approval")))),
      execution,
      rollback: playbook.rollbackRequired ? (evidence.some((row) => row.evidenceType === "ROLLBACK_PAYLOAD" || row.evidenceType === "ROLLBACK_RESULT") ? "COMPLETE" as const : "MISSING" as const) : (evidence.some((row) => row.evidenceType === "ROLLBACK_PAYLOAD") ? "COMPLETE" as const : "NOT_APPLICABLE" as const),
      verification: complete(evidence.some((row) => row.evidenceType === "VERIFICATION_RESULT" && String(row.summary).toLowerCase().includes("passed"))),
      outcome: complete(linkedOutcomes.length > 0),
      protection: complete(linkedProtected.length > 0),
      drift: complete(linkedProtected.some((outcome) => outcome.policyIds.length > 0 && outcome.nextCheckAt)),
      executiveProof: complete(evidence.some((row) => row.evidenceType === "PRE_STATE") && evidence.some((row) => row.evidenceType === "POST_STATE") && evidence.some((row) => row.evidenceType === "VERIFICATION_RESULT") && linkedProtected.length > 0),
    };
    const blockers = blockersFor(base);
    playbookStatus.push({ ...base, blockers, certified: blockers.length === 0 });
  }
  return { tenantId, certified: playbookStatus.every((row) => row.certified), playbooks: playbookStatus };
}
