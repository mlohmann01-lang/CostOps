import type { OperationalizationPack, PackEvaluationResult } from "./base-pack";

export const flexeraValuePack: OperationalizationPack = {
  packType: "FLEXERA_VALUE_REALIZATION",
  evaluate(apps) {
    const total = apps.length || 1;
    const entitlement = apps.filter((a) => (a.entitlementCount ?? 0) > 0).length / total;
    const pricing = apps.filter((a) => a.annualCost || a.monthlyCost).length / total;
    const contract = apps.filter((a) => (a.contractIds ?? []).length > 0).length / total;
    const ownership = apps.filter((a) => a.owner).length / total;
    const stale = apps.filter((a) => (a.sourceFreshness ?? 1) < 0.5).length;
    let score = (pricing * 0.3 + entitlement * 0.3 + contract * 0.15 + ownership * 0.15 + (1 - stale / total) * 0.1) * 100;
    if (stale > 0) score -= 10;
    const blockers:string[] = [];
    if (pricing < 0.8) blockers.push("Pricing evidence gaps");
    if (entitlement < 0.8) blockers.push("Entitlement completeness gaps");
    if (stale > 0) blockers.push("Stale Flexera inventory");
    return { readinessScore: Math.max(0, Math.round(score)), status: score >= 85 ? "READY_FOR_GOVERNANCE" : blockers.length ? "BLOCKED" : "IN_PROGRESS", blockers, nextActions: [], topPriorityApps: apps.sort((a,b)=>(b.annualCost??0)-(a.annualCost??0)).slice(0,5).map((a:any)=>({appKey:a.appKey,score:a.annualCost??0})), evidence: { entitlement, pricing, contract, ownership, stale, highestValueOptimizationOpportunities: apps.filter((a:any)=>(a.annualCost??0)>50000).length } } satisfies PackEvaluationResult;
  },
  summarize(result) { return { readinessScore: result.readinessScore, blockers: result.blockers, riskAreas: result.blockers.length }; },
  generateNextActions(result) { return result.blockers.map((b) => `Address: ${b}`); },
  emitEvents(result) { return result.blockers.map((b) => ({ eventType: b.includes("Pricing") ? "PRICING_REQUIRED" : "BLOCKER_DETECTED", severity: "WARNING", message: b, evidence: result.evidence })); },
};
