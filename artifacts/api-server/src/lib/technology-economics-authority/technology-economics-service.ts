// Program X3 — Capabilities 2-6: spend attribution, value attribution, unit
// economics, confidence, and portfolio summary — all derived from the
// Technology Portfolio Authority's real spend records and Economic Outcome
// Attribution's real measured value. No new ledgers, no new attribution
// system: this module only joins and computes over data that already exists.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import type { TechnologyPortfolioAsset } from '../technology-portfolio-authority/technology-portfolio-types';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import { technologyInvestmentService } from '../technology-investment-authority/technology-investment-service';
import { CAPABILITY_UNKNOWN } from '../technology-investment-authority/technology-investment-types';
import type {
  TechnologyEconomicsMetric, TechnologyEconomicsReadiness, TechnologyEconomicsSubjectType, TechnologyEconomicsSummary,
} from './technology-economics-types';

function readinessFromInputs(spendKnown: boolean, hasOutcomes: boolean, evidenceExists: boolean, confidenceScore: number): TechnologyEconomicsReadiness {
  if (spendKnown && hasOutcomes && evidenceExists && confidenceScore >= 70) return 'READY';
  if ((spendKnown || hasOutcomes || evidenceExists) && confidenceScore >= 40) return 'PARTIAL';
  return 'NOT_READY';
}

interface EconomicsInputs {
  subjectType: TechnologyEconomicsSubjectType;
  subjectId: string;
  spendAmount?: number;
  spendCurrency?: string;
  outcomeIds: string[];
  capabilityCount: number;
  objectiveCount: number;
  evidenceCount: number;
  graphReady: boolean;
}

/** Capabilities 2-5: builds one TechnologyEconomicsMetric from real, already-recorded inputs. */
function buildMetric(tenantId: string, inputs: EconomicsInputs): TechnologyEconomicsMetric {
  const unknowns: string[] = [];

  // Capability 2: spend attribution — never invented, taken only from real portfolio spend.
  const { spendAmount, spendCurrency } = inputs;
  if (spendAmount === undefined) unknowns.push('SPEND_UNKNOWN');

  // Capability 3: value attribution — only outcomes with a real measuredValue count; a target
  // or expected value is a projection, not proof, and never becomes the known value.
  const outcomes = economicOutcomeAttributionService.listEconomicOutcomes(tenantId).filter((o) => inputs.outcomeIds.includes(o.id));
  const measuredOutcomes = outcomes.filter((o) => typeof o.measuredValue === 'number');
  const knownValueAmount = measuredOutcomes.length > 0 ? measuredOutcomes.reduce((sum, o) => sum + (o.measuredValue as number), 0) : undefined;
  const knownValueCurrency = measuredOutcomes[0]?.currency;
  if (knownValueAmount === undefined) unknowns.push('VALUE_UNKNOWN');

  const outcomeCount = inputs.outcomeIds.length;
  if (outcomeCount === 0) unknowns.push('OUTCOME_UNKNOWN');
  if (inputs.capabilityCount === 0) unknowns.push('CAPABILITY_UNKNOWN');
  if (inputs.evidenceCount === 0) unknowns.push('EVIDENCE_UNKNOWN');

  // Capability 4: unit economics — never divide by zero, never compute ROI without known value.
  const costPerOutcome = spendAmount !== undefined && outcomeCount > 0 ? spendAmount / outcomeCount : undefined;
  const costPerCapability = spendAmount !== undefined && inputs.capabilityCount > 0 ? spendAmount / inputs.capabilityCount : undefined;
  const roiRatio = spendAmount !== undefined && spendAmount > 0 && knownValueAmount !== undefined ? knownValueAmount / spendAmount : undefined;

  // Capability 5: confidence — capped where critical data is missing.
  let confidenceScore = 0;
  if (spendAmount !== undefined) confidenceScore += 25;
  if (knownValueAmount !== undefined) confidenceScore += 25;
  if (inputs.evidenceCount > 0) confidenceScore += 20;
  if (inputs.graphReady) confidenceScore += 15;
  if (outcomeCount > 0) confidenceScore += 15;

  if (spendAmount === undefined) confidenceScore = Math.min(confidenceScore, 60);
  if (knownValueAmount === undefined) confidenceScore = Math.min(confidenceScore, 70);
  if (inputs.evidenceCount === 0) confidenceScore = Math.min(confidenceScore, 50);

  const readiness = readinessFromInputs(spendAmount !== undefined, outcomeCount > 0, inputs.evidenceCount > 0, confidenceScore);

  return {
    id: `tech-econ:${inputs.subjectType}:${inputs.subjectId}`,
    tenantId,
    subjectType: inputs.subjectType,
    subjectId: inputs.subjectId,
    spendAmount,
    spendCurrency,
    knownValueAmount,
    knownValueCurrency,
    outcomeCount,
    capabilityCount: inputs.capabilityCount,
    objectiveCount: inputs.objectiveCount,
    evidenceCount: inputs.evidenceCount,
    costPerOutcome,
    costPerCapability,
    roiRatio,
    confidenceScore,
    readiness,
    unknowns,
    generatedAt: new Date().toISOString(),
  };
}

function subjectTypeForAsset(asset: TechnologyPortfolioAsset): TechnologyEconomicsSubjectType {
  switch (asset.assetType) {
    case 'SAAS': return 'SAAS_APPLICATION';
    case 'CLOUD_SERVICE': return 'CLOUD_SERVICE';
    case 'DATA_PLATFORM': return 'DATA_PLATFORM';
    case 'AI_MODEL': case 'AI_AGENT': case 'AI_WORKFLOW': return 'AI_SYSTEM';
    case 'SECURITY_TOOL': return 'SECURITY_PLATFORM';
    default: return 'TECHNOLOGY_ASSET';
  }
}

export class TechnologyEconomicsService {
  /** Capabilities 2-4: a single technology asset's own economics, isolated to its own spend/outcomes/evidence. */
  async getAssetEconomics(tenantId: string, assetId: string): Promise<TechnologyEconomicsMetric> {
    const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
    const graph = await technologyInvestmentService.getGraph(tenantId);
    if (!asset) {
      return buildMetric(tenantId, {
        subjectType: 'TECHNOLOGY_ASSET', subjectId: assetId, outcomeIds: [], capabilityCount: 0, objectiveCount: 0, evidenceCount: 0,
        graphReady: graph.readiness !== 'NOT_READY',
      });
    }

    const objectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);
    const hasCapability = Boolean(asset.businessCapability && asset.businessCapability.trim().length > 0);
    const objectiveCount = hasCapability ? objectives.filter((o) => (o.linkedAssetIds ?? []).includes(asset.id)).length : 0;

    return buildMetric(tenantId, {
      subjectType: subjectTypeForAsset(asset),
      subjectId: asset.id,
      spendAmount: asset.annualSpend,
      spendCurrency: asset.currency,
      outcomeIds: asset.outcomeIds,
      capabilityCount: hasCapability ? 1 : 0,
      objectiveCount,
      evidenceCount: asset.evidenceRefs.length,
      graphReady: graph.readiness !== 'NOT_READY',
    });
  }

  async getAllAssetEconomics(tenantId: string): Promise<TechnologyEconomicsMetric[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    return Promise.all(portfolio.assets.map((a) => this.getAssetEconomics(tenantId, a.id)));
  }

  /** Vendor-level economics: rolled up across the vendor's own assets — never recomputed per source system. */
  async getVendorEconomics(tenantId: string, vendorId: string): Promise<TechnologyEconomicsMetric> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const vendor = portfolio.vendors.find((v) => v.id === vendorId);
    const assets = portfolio.assets.filter((a) => a.vendorId === vendorId);
    const graph = await technologyInvestmentService.getGraph(tenantId);
    const objectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);

    const assetSpends = assets.map((a) => a.annualSpend).filter((s): s is number => typeof s === 'number');
    const spendAmount = assetSpends.length > 0 ? assetSpends.reduce((s, v) => s + v, 0) : (vendor?.annualSpend);
    const capableAssets = assets.filter((a) => Boolean(a.businessCapability && a.businessCapability.trim().length > 0));
    const supportedAssetIds = assets.map((a) => a.id);

    return buildMetric(tenantId, {
      subjectType: 'VENDOR',
      subjectId: vendorId,
      spendAmount,
      spendCurrency: vendor?.currency ?? assets[0]?.currency,
      outcomeIds: [...new Set(assets.flatMap((a) => a.outcomeIds))],
      capabilityCount: new Set(capableAssets.map((a) => a.businessCapability)).size,
      objectiveCount: objectives.filter((o) => (o.linkedAssetIds ?? []).some((id) => supportedAssetIds.includes(id))).length,
      evidenceCount: [...new Set(assets.flatMap((a) => a.evidenceRefs))].length,
      graphReady: graph.readiness !== 'NOT_READY',
    });
  }

  /** Capability-level economics: rolled up across every technology supporting that capability. */
  async getCapabilityEconomics(tenantId: string, capabilityId: string): Promise<TechnologyEconomicsMetric | undefined> {
    const capabilities = await technologyInvestmentService.getCapabilities(tenantId);
    const capability = capabilities.find((c) => c.id === capabilityId);
    if (!capability) return undefined;

    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const assets = portfolio.assets.filter((a) => capability.supportingTechnologyIds.includes(a.id));
    const graph = await technologyInvestmentService.getGraph(tenantId);

    const assetSpends = assets.map((a) => a.annualSpend).filter((s): s is number => typeof s === 'number');
    const spendAmount = assetSpends.length > 0 ? assetSpends.reduce((s, v) => s + v, 0) : undefined;

    return buildMetric(tenantId, {
      subjectType: 'BUSINESS_CAPABILITY',
      subjectId: capabilityId,
      spendAmount,
      spendCurrency: assets[0]?.currency,
      outcomeIds: capability.outcomeIds,
      capabilityCount: capability.name === CAPABILITY_UNKNOWN ? 0 : 1,
      objectiveCount: capability.objectiveIds.length,
      evidenceCount: [...new Set(assets.flatMap((a) => a.evidenceRefs))].length,
      graphReady: graph.readiness !== 'NOT_READY',
    });
  }

  /** Capability 6: portfolio-level technology economics view. */
  async getSummary(tenantId: string): Promise<TechnologyEconomicsSummary> {
    const metrics = await this.getAllAssetEconomics(tenantId);
    const withSpend = metrics.filter((m) => m.spendAmount !== undefined);
    const withValue = metrics.filter((m) => m.knownValueAmount !== undefined);
    const withROI = metrics.filter((m) => m.roiRatio !== undefined);
    const costsPerOutcome = metrics.map((m) => m.costPerOutcome).filter((c): c is number => c !== undefined);

    return {
      tenantId,
      totalTechnologies: metrics.length,
      assetsWithSpend: withSpend.length,
      assetsWithValue: withValue.length,
      assetsWithROI: withROI.length,
      averageCostPerOutcome: costsPerOutcome.length > 0 ? costsPerOutcome.reduce((s, c) => s + c, 0) / costsPerOutcome.length : undefined,
      averageConfidence: metrics.length > 0 ? metrics.reduce((s, m) => s + m.confidenceScore, 0) / metrics.length : 0,
      unknownSpendCount: metrics.filter((m) => m.unknowns.includes('SPEND_UNKNOWN')).length,
      unknownValueCount: metrics.filter((m) => m.unknowns.includes('VALUE_UNKNOWN')).length,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const technologyEconomicsService = new TechnologyEconomicsService();
