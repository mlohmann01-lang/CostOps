import type { OperationalizationPack, PackEvaluationResult } from "./base-pack";

export const serviceNowSamPack: OperationalizationPack = {
  packType: "SERVICENOW_SAM_ACCELERATION",
  evaluate(apps) {
    const total = apps.length || 1;
    const ownership = apps.filter((a) => a.owner).length / total;
    const entitlement = apps.filter((a) => (a.entitlementCount ?? 0) > 0).length / total;
    const conflicts = apps.filter((a) => a.reconciliationConflict).length;
    const pricing = apps.filter((a) => a.annualCost || a.monthlyCost).length / total;
    const costCenter = apps.filter((a) => a.costCenter).length / total;
    let score = (ownership * 0.3 + entitlement * 0.3 + pricing * 0.15 + costCenter * 0.15 + (1 - conflicts / total) * 0.1) * 100;
    if (conflicts > 0) score -= 15;
    const blockers = [] as string[];
    if (ownership < 0.8) blockers.push("Ownership coverage below target");
    if (entitlement < 0.8) blockers.push("Entitlement mapping coverage below target");
    if (conflicts > 0) blockers.push("Reconciliation conflicts detected");
    const status = score >= 85 ? "READY_FOR_GOVERNANCE" : blockers.length ? "BLOCKED" : "IN_PROGRESS";
    return { readinessScore: Math.max(0, Math.round(score)), status, blockers, nextActions: [], topPriorityApps: apps.sort((a,b)=>(b.priorityScore??0)-(a.priorityScore??0)).slice(0,5).map((a:any)=>({appKey:a.appKey,score:a.priorityScore??0})), evidence: { ownership, entitlement, pricing, costCenter, conflicts, estimatedOperationalizationEffort: Math.ceil((1 - score/100)*100) } } satisfies PackEvaluationResult;
  },
  summarize(result) { return { readinessScore: result.readinessScore, blockers: result.blockers, effort: (result.evidence as any).estimatedOperationalizationEffort }; },
  generateNextActions(result) {
    const actions = ["assign owner","map entitlement","connect pricing evidence","resolve reconciliation conflict","enrich ServiceNow metadata","validate cost center"];
    return actions.filter((a) => result.blockers.length || a === "enrich ServiceNow metadata");
  },
  emitEvents(result) { return result.blockers.map((b) => ({ eventType: "BLOCKER_DETECTED", severity: "WARNING", message: b, evidence: result.evidence })); },
};
