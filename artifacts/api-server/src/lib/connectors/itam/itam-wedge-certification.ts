import { governedActionService, type GovernedAction } from "../../actions/governed-actions";
import { governedExecutionService, type GovernedExecutionType } from "../../execution/governed-execution";
import { connectorSupportsCapability } from "../../execution/execution-connectors";
import { economicOutcomeAttributionService } from "../../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../../outcome-protection/outcome-protection";

export type ItamExecutionClassification = "REAL_PROVIDER_EXECUTION" | "CONTROLLED_EXECUTION" | "SIMULATED_ONLY" | "NOT_IMPLEMENTED";
export type ItamCertificationStatus = "COMPLETE" | "MISSING";
export type ItamRollbackStatus = "COMPLETE" | "MISSING" | "PARTIAL" | "NOT_APPLICABLE";

export type ItamPlaybookCertification = {
  playbookId: string;
  name: string;
  discovery: ItamCertificationStatus;
  trust: ItamCertificationStatus;
  approval: ItamCertificationStatus;
  execution: ItamExecutionClassification;
  rollback: ItamRollbackStatus;
  verification: ItamCertificationStatus;
  outcome: ItamCertificationStatus;
  protection: ItamCertificationStatus;
  drift: ItamCertificationStatus;
  executiveProof: ItamCertificationStatus;
  certified: boolean;
  blockers: string[];
};

const playbooks = [
  {
    playbookId: "itam-unused-licence-reclaim",
    name: "Unused Licence Reclaim",
    terms: ["unused", "licence", "reclaim"],
    executionTypes: ["ITAM_RECLAIM_LICENSE"] as GovernedExecutionType[],
    capabilities: ["READ_ASSET", "READ_LICENSE", "RECLAIM_LICENSE", "RESTORE_LICENSE_ITAM", "VERIFY_ASSET_STATE", "ROLLBACK_ITAM_ACTION"],
    partialRollback: false,
  },
  {
    playbookId: "itam-duplicate-capability-consolidation",
    name: "Duplicate Capability Consolidation",
    terms: ["duplicate", "capability", "consolidat"],
    executionTypes: ["ITAM_CONSOLIDATE_CAPABILITY"] as GovernedExecutionType[],
    capabilities: ["READ_ASSET", "READ_LICENSE", "CONSOLIDATE_CAPABILITY", "VERIFY_ASSET_STATE", "ROLLBACK_ITAM_ACTION"],
    partialRollback: true,
  },
  {
    playbookId: "itam-renewal-optimisation",
    name: "Renewal Optimisation",
    terms: ["renewal", "optimis"],
    executionTypes: ["ITAM_CREATE_RENEWAL_REVIEW"] as GovernedExecutionType[],
    capabilities: ["READ_ASSET", "READ_CONTRACT", "CREATE_RENEWAL_REVIEW", "VERIFY_ASSET_STATE"],
    partialRollback: false,
  },
  {
    playbookId: "itam-orphaned-asset-remediation",
    name: "Orphaned Asset Remediation",
    terms: ["orphan", "asset", "remediat"],
    executionTypes: ["ITAM_ASSIGN_OWNER", "ITAM_ASSIGN_COST_CENTRE"] as GovernedExecutionType[],
    capabilities: ["READ_ASSET", "READ_OWNER", "ASSIGN_OWNER", "ASSIGN_COST_CENTRE", "VERIFY_ASSET_STATE", "ROLLBACK_ITAM_ACTION"],
    partialRollback: false,
  },
  {
    playbookId: "itam-hardware-retirement",
    name: "Hardware Retirement",
    terms: ["hardware", "retir"],
    executionTypes: ["ITAM_MARK_RETIRED"] as GovernedExecutionType[],
    capabilities: ["READ_ASSET", "MARK_RETIRED", "MARK_ACTIVE", "VERIFY_ASSET_STATE", "ROLLBACK_ITAM_ACTION"],
    partialRollback: false,
  },
] as const;

function complete(value: boolean): ItamCertificationStatus { return value ? "COMPLETE" : "MISSING"; }

function matches(action: GovernedAction, playbook: typeof playbooks[number]) {
  const haystack = [action.id, action.title, action.description, action.sourceId, ...action.recommendationIds, ...action.evidenceIds].join(" ").toLowerCase();
  return haystack.includes(playbook.playbookId) || playbook.terms.every((term) => haystack.includes(term));
}

function buildBlockers(row: Omit<ItamPlaybookCertification, "blockers" | "certified">, missingCapabilities: string[], partialAllowed: boolean): string[] {
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
  if (missingCapabilities.length) out.push(`Missing ITAM capabilities: ${missingCapabilities.join(",")}`);
  return out;
}

export async function getItamWedgeCertification(tenantId: string) {
  const actions = await governedActionService.list(tenantId);
  const executions = governedExecutionService.listExecutions(tenantId);
  const connectors = governedExecutionService.listConnectors(tenantId).filter((c) => (c.connectorType === "ITAM" || c.connectorType === "FLEXERA") && c.status === "CONNECTED");
  const outcomes = economicOutcomeAttributionService.listEconomicOutcomes(tenantId, { assetType: "ITAM" });
  const protectedOutcomes = outcomeProtectionService.listProtectedOutcomes(tenantId, { assetType: "ITAM" });

  const playbookStatus = playbooks.map<ItamPlaybookCertification>((playbook) => {
    const playbookActions = actions.filter((action) => action.domain === "ITAM" && matches(action, playbook));
    const executionRows = executions.filter((e) => playbook.executionTypes.includes(e.executionType as GovernedExecutionType) && playbookActions.some((a) => a.id === e.actionId));
    const evidence = executionRows.flatMap((e) => governedExecutionService.listEvidence(tenantId, e.id));
    const missingCapabilities = playbook.capabilities.filter((cap) => !connectors.some((c) => connectorSupportsCapability(c, cap)));
    const linkedOutcomeIds = new Set(playbookActions.flatMap((a) => a.outcomeIds));
    const linkedOutcomes = outcomes.filter((o) => linkedOutcomeIds.has(o.id) || playbookActions.some((a) => a.id === o.assetId));
    const linkedProtected = protectedOutcomes.filter((o) => linkedOutcomeIds.has(o.outcomeId) || playbookActions.some((a) => a.id === o.actionId));
    const hasRollbackPayload = evidence.some((e) => e.evidenceType === "ROLLBACK_PAYLOAD");
    const hasPartialEvidence = evidence.some((e) => e.evidenceType === "ROLLBACK_RESULT" && /PARTIAL/i.test(e.summary));
    const rollback: ItamRollbackStatus = hasRollbackPayload ? playbook.partialRollback ? "PARTIAL" : "COMPLETE" : "MISSING";

    const base: Omit<ItamPlaybookCertification, "blockers" | "certified"> = {
      playbookId: playbook.playbookId,
      name: playbook.name,
      discovery: complete(playbookActions.some((a) => a.evidenceIds.some((id) => /discover|recommendation|itam|flexera|asset/i.test(id)))),
      trust: complete(playbookActions.some((a) => (a.trustScore ?? 0) > 0 && a.evidenceIds.some((id) => /trust|readiness|identity|usage|financial/i.test(id)))),
      approval: complete(playbookActions.some((a) => ["APPROVED", "VERIFIED", "RETAINED"].includes(a.status) || a.evidenceIds.some((id) => /approval/i.test(id)))),
      execution: executionRows.some((e) => e.executionMode === "CONTROLLED" && e.status === "COMPLETED" && missingCapabilities.length === 0) ? "CONTROLLED_EXECUTION" : executionRows.some((e) => e.executionMode === "SIMULATION" || e.status === "DRY_RUN") ? "SIMULATED_ONLY" : "NOT_IMPLEMENTED",
      rollback,
      verification: complete(evidence.some((e) => e.evidenceType === "VERIFICATION_RESULT" && /passed/i.test(e.summary))),
      outcome: complete(linkedOutcomes.length > 0),
      protection: complete(linkedProtected.length > 0),
      drift: complete(linkedProtected.some((o) => o.policyIds.length > 0 && o.nextCheckAt)),
      executiveProof: complete(evidence.some((e) => e.evidenceType === "PRE_STATE") && evidence.some((e) => e.evidenceType === "POST_STATE") && evidence.some((e) => e.evidenceType === "VERIFICATION_RESULT") && linkedProtected.length > 0),
    };

    const blockers = buildBlockers(base, missingCapabilities, !playbook.partialRollback || hasPartialEvidence || hasRollbackPayload);
    return { ...base, certified: blockers.length === 0, blockers };
  });

  return {
    certified: playbookStatus.every((p) => p.certified),
    playbooks: playbookStatus,
    certifiedPlaybooks: playbookStatus.filter((p) => p.certified).length,
    uncertifiedPlaybooks: playbookStatus.filter((p) => !p.certified).length,
  };
}
