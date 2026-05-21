import { createHash } from 'node:crypto';
import type { EvidenceFreshnessState, M365NormalizedUserLicenseEvidence } from './m365-readonly-evidence-sync-service';
import { M365_FEATURE_UTILIZATION_CLASSIFIER, M365_LICENSE_PRICING_CATALOG, M365_PLAYBOOK_REGISTRY, type M365EconomicRecommendationType } from './m365-economic-operations-registry';

export type M365SavingsConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type M365TrustScore = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
export type M365SkuPricing = { skuId: string; skuName?: string; monthlyPrice: number; currency?: string };

export type M365OperationalRecommendation = {
  recommendationId: string;
  playbookId: string;
  recommendationType: M365EconomicRecommendationType;
  provider: 'Microsoft 365';
  affectedUser: { userId: string; userPrincipalName: string; displayName: string; department?: string };
  affectedLicenses: string[];
  projectedMonthlySavings: number;
  projectedAnnualSavings: number;
  trustLevel: M365TrustScore;
  confidenceReasoning: string;
  utilizationReasoning: string;
  evidenceFreshness: EvidenceFreshnessState;
  evidenceConfidence: number;
  simulationSupport: boolean;
  rollbackSupport: boolean;
  approvalRequirement: 'REQUIRED' | 'RECOMMENDED';
  blastRadiusClass: 'LOW' | 'MEDIUM' | 'HIGH';
  proofReferences: string[];
  recommendedAction: string;
  verificationStrategy: string;
  driftStrategy: string;
  currentState: string;
  exclusionReasons: string[];
  createdAt: string;
};

export function generateM365Recommendations(input: { tenantId: string; normalizedEvidence: M365NormalizedUserLicenseEvidence[]; skuPricingCatalog: M365SkuPricing[]; generationOptions?: { inactivityDaysThreshold?: number } }): { recommendations: M365OperationalRecommendation[]; summary: { usersEvaluated: number; recommendationsGenerated: number; warnings: string[] } } {
  const inactivityThreshold = input.generationOptions?.inactivityDaysThreshold ?? 45;
  const bySku = new Map(input.skuPricingCatalog.map((p) => [p.skuId.toUpperCase(), p.monthlyPrice]));
  const recs: M365OperationalRecommendation[] = [];
  const warnings = new Set<string>();
  const mkId = (u: M365NormalizedUserLicenseEvidence, playbookId: string, kind: string) => createHash('sha256').update(`${input.tenantId}|${u.userId}|${playbookId}|${kind}|${u.assignedSkuIds.sort().join(',')}`).digest('hex').slice(0, 24);
  const trust = (u: M365NormalizedUserLicenseEvidence): M365TrustScore => u.evidenceFreshness === 'FRESH' ? 'HIGH' : u.evidenceFreshness === 'STALE' ? 'MEDIUM' : 'LOW';
  const price = (sku: string) => bySku.get(sku.toUpperCase()) ?? M365_LICENSE_PRICING_CATALOG[sku.toUpperCase() as keyof typeof M365_LICENSE_PRICING_CATALOG] ?? 0;

  for (const u of input.normalizedEvidence) {
    if (u.exclusionReasons.length > 0 || u.assignedLicenseCount === 0) continue;
    const isInactive = u.accountEnabled && (u.inactivityDays ?? 0) >= inactivityThreshold;
    const hasE5 = u.assignedSkuNames.some((s) => /E5/i.test(s));
    const hasCopilot = u.assignedSkuNames.some((s) => /COPILOT/i.test(s));
    const addOns = u.assignedSkuNames.filter((s) => /(POWER BI|TEAMS PHONE|AUDIO|VISIO|PROJECT|DEFENDER|FABRIC|COPILOT)/i.test(s));
    const overlap = u.assignedSkuNames.some((s) => /E5/i.test(s)) && addOns.some((s) => /(TEAMS PHONE|POWER BI|DEFENDER)/i.test(s));
    const tier = M365_FEATURE_UTILIZATION_CLASSIFIER.classifyTierNeed(Math.max(0, Math.min(1, ((u.inactivityDays ?? 0) / 120))));

    const push = (playbookId: string, recommendationType: M365EconomicRecommendationType, affected: string[], util: string, action: string, monthly: number) => {
      const reg = M365_PLAYBOOK_REGISTRY[playbookId];
      recs.push({ recommendationId: mkId(u, playbookId, recommendationType), playbookId, recommendationType, provider: 'Microsoft 365', affectedUser: { userId: u.userId, userPrincipalName: u.userPrincipalName, displayName: u.displayName }, affectedLicenses: affected, projectedMonthlySavings: Number(monthly.toFixed(2)), projectedAnnualSavings: Number((monthly * 12).toFixed(2)), trustLevel: trust(u), confidenceReasoning: `freshness=${u.evidenceFreshness};confidence=${u.evidenceConfidence.toFixed(2)}`, utilizationReasoning: util, evidenceFreshness: u.evidenceFreshness, evidenceConfidence: u.evidenceConfidence, simulationSupport: reg.simulationSupport, rollbackSupport: reg.rollbackSupport, approvalRequirement: reg.approvalRequirement, blastRadiusClass: reg.blastRadiusClass, proofReferences: [`m365:user:${u.userId}`, `m365:licenses:${u.userId}`, `m365:activity:${u.userId}`, `m365:playbook:${playbookId}`], recommendedAction: action, verificationStrategy: reg.verificationStrategy, driftStrategy: reg.driftStrategy, currentState: util, exclusionReasons: [], createdAt: new Date().toISOString() });
    };

    if (isInactive) {
      const target = hasE5 ? 'E5→E3' : 'E3→F3/Web';
      push('m365-inactive-user-rightsizing', 'LICENSE_RIGHTSIZE_REVIEW', u.assignedSkuNames, `inactiveDays=${u.inactivityDays};target=${target};serviceLossRisk=MEDIUM`, `Review rightsizing (${target}) with simulation before approval`, u.assignedSkuIds.reduce((n, s) => n + price(s), 0) * 0.5);
    }
    if (hasE5 && tier !== 'E5_REQUIRED') {
      push('m365-e5-to-e3-downgrade', 'LICENSE_TIER_DOWNGRADE', u.assignedSkuNames.filter((s) => /E5|E3/i.test(s)), `E5 capabilities underused; retained E3 baseline likely sufficient; tierSignal=${tier}`, 'Downgrade E5 to E3 with safety checks and rollback ready', Math.max(0, (M365_LICENSE_PRICING_CATALOG.E5 - M365_LICENSE_PRICING_CATALOG.E3)));
    }
    if (addOns.length > 0 && ((u.inactivityDays ?? 0) >= 30 || u.evidenceFreshness !== 'FRESH')) {
      push('m365-addon-reclaim', 'ADDON_RECLAIM', addOns, `addonCount=${addOns.length};usageLow=true;threshold=30d`, 'Reclaim unused add-ons with post-removal verification', addOns.reduce((n, s) => n + price(s), 0) * 0.7);
    }
    if (hasCopilot) {
      const days = u.inactivityDays ?? 0;
      const type: M365EconomicRecommendationType = days >= 60 ? 'COPILOT_RECLAIM' : days >= 30 ? 'COPILOT_REALLOCATE' : 'COPILOT_REVIEW';
      push('m365-copilot-reclamation-governance', type, u.assignedSkuNames.filter((s) => /COPILOT/i.test(s)), `copilotAssigned=true;inactivityDays=${days};governance=HIGH_COST`, type === 'COPILOT_RECLAIM' ? 'Reclaim inactive Copilot licenses' : type === 'COPILOT_REALLOCATE' ? 'Reallocate Copilot to higher-usage cohort' : 'Review Copilot assignment', M365_LICENSE_PRICING_CATALOG.COPILOT);
    }
    if (overlap) {
      push('m365-license-overlap-elimination', 'LICENSE_OVERLAP_ELIMINATION', u.assignedSkuNames, 'detected overlapping conferencing/security/BI capabilities; candidate ranking=HIGH', 'Eliminate overlapping licenses with supersedence proof', Math.max(5, addOns.reduce((n, s) => n + price(s), 0) * 0.5));
    }
  }

  const dedup = new Map<string, M365OperationalRecommendation>();
  for (const r of recs) {
    const k = `${r.playbookId}:${r.affectedUser.userId}:${r.recommendationType}:${r.affectedLicenses.sort().join(',')}`;
    if (!dedup.has(k)) dedup.set(k, r);
  }

  return { recommendations: [...dedup.values()], summary: { usersEvaluated: input.normalizedEvidence.length, recommendationsGenerated: dedup.size, warnings: [...warnings] } };
}
