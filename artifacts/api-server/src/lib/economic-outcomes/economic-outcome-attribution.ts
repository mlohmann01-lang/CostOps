import { createHash, randomUUID } from "node:crypto";
import { platformEventService } from "../events/platform-event-service";
import { aiIntelligenceService } from "../ai-economic-control/ai-intelligence";

export type AssetType =
  | "AI_ASSET"
  | "SAAS"
  | "M365"
  | "CLOUD"
  | "ITAM"
  | "APPLICATION"
  | "OTHER";
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type Source = "MANUAL" | "IMPORT" | "SYSTEM" | "CONNECTOR" | "DEMO";
export type EconomicDecisionType =
  | "KEEP"
  | "OPTIMISE"
  | "EXPAND"
  | "RETIRE"
  | "REVIEW"
  | "INSUFFICIENT_EVIDENCE";
export type EconomicOutcome = {
  id: string;
  tenantId: string;
  assetId: string;
  assetType: AssetType;
  outcomeType:
    | "PRODUCTIVITY"
    | "COST_REDUCTION"
    | "REVENUE_ENABLEMENT"
    | "RISK_REDUCTION"
    | "SERVICE_IMPROVEMENT"
    | "ADOPTION"
    | "PROCESS_EFFICIENCY"
    | "UNKNOWN";
  name: string;
  description?: string;
  businessOwnerId?: string;
  department?: string;
  costCentre?: string;
  status:
    | "PROPOSED"
    | "ACTIVE"
    | "MEASURED"
    | "UNPROVEN"
    | "FAILED"
    | "RETIRED";
  measurementConfidence: Confidence;
  expectedValue?: number;
  measuredValue?: number;
  currency?: string;
  periodStart?: string;
  periodEnd?: string;
  source: Source;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
export type BusinessObjective = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  ownerId?: string;
  department?: string;
  linkedAssetIds: string[];
  targetMetric?: string;
  targetValue?: number;
  periodStart?: string;
  periodEnd?: string;
  status: "ACTIVE" | "AT_RISK" | "ACHIEVED" | "FAILED" | "UNKNOWN";
  createdAt: string;
  updatedAt: string;
};
export type ValueSignal = {
  id: string;
  tenantId: string;
  assetId: string;
  outcomeId?: string;
  signalType:
    | "TIME_SAVED"
    | "TASKS_COMPLETED"
    | "TICKETS_RESOLVED"
    | "COST_AVOIDED"
    | "REVENUE_INFLUENCED"
    | "ERROR_REDUCTION"
    | "CYCLE_TIME_REDUCTION"
    | "ADOPTION_RATE"
    | "USER_SATISFACTION"
    | "OTHER";
  value: number;
  unit:
    | "HOURS"
    | "TASKS"
    | "TICKETS"
    | "DOLLARS"
    | "PERCENT"
    | "COUNT"
    | "SCORE";
  confidence: Confidence;
  evidenceRef?: string;
  source: Source;
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
};
export type ProductivitySignal = ValueSignal & {
  signalType:
    | "TIME_SAVED"
    | "TASKS_COMPLETED"
    | "TICKETS_RESOLVED"
    | "CYCLE_TIME_REDUCTION";
};
export type AdoptionSignal = ValueSignal & {
  signalType: "ADOPTION_RATE" | "USER_SATISFACTION";
};
export type OutcomeAttribution = {
  id: string;
  tenantId: string;
  assetId: string;
  outcomeId: string;
  attributionMethod:
    | "DIRECT"
    | "OWNER_ATTESTED"
    | "USAGE_CORRELATED"
    | "SPEND_CORRELATED"
    | "MANUAL_ESTIMATE"
    | "UNKNOWN";
  attributionConfidence: Confidence;
  attributedValue?: number;
  attributedCost?: number;
  netValue?: number;
  valueToCostRatio?: number;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
};
export type EconomicDecision = {
  id: string;
  tenantId: string;
  assetId: string;
  decision: EconomicDecisionType;
  reason: string;
  confidence: Confidence;
  cost?: number;
  measuredValue?: number;
  netValue?: number;
  valueToCostRatio?: number;
  relatedOutcomeIds: string[];
  relatedRecommendationIds: string[];
  evidenceIds: string[];
  createdAt: string;
};
export type EconomicEvidence = {
  id: string;
  tenantId: string;
  entityId: string;
  eventType:
    | "VALUE_SIGNAL_CAPTURED"
    | "OUTCOME_ATTRIBUTED_TO_ASSET"
    | "ECONOMIC_DECISION_CREATED";
  payload: Record<string, unknown>;
  createdAt: string;
};

function now() {
  return new Date().toISOString();
}
function id(prefix: string, ...parts: string[]) {
  return `${prefix}-${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16)}`;
}
const outOfScopeTerms = [
  [["Left", "Shield"].join("")],
  ["Agent", "Security", "Analytics"],
  ["attack", "path"],
  ["exploit"],
  ["prompt", "tracing"],
  ["runtime", "security"],
  ["MCP", "attack"],
].map((p) => p.join(" "));
function assertInScope(value: unknown) {
  if (
    new RegExp(outOfScopeTerms.join("|"), "i").test(JSON.stringify(value ?? {}))
  )
    throw new Error("ECONOMIC_OUTCOME_ATTRIBUTION_ONLY");
}
function confidenceRank(c: Confidence) {
  return c === "HIGH" ? 3 : c === "MEDIUM" ? 2 : c === "LOW" ? 1 : 0;
}

class EconomicOutcomeRepository {
  private static outcomes = new Map<string, EconomicOutcome>();
  private static objectives = new Map<string, BusinessObjective>();
  private static signals = new Map<string, ValueSignal>();
  private static attributions = new Map<string, OutcomeAttribution>();
  private static decisions = new Map<string, EconomicDecision>();
  private static evidence = new Map<string, EconomicEvidence>();
  clearForTests() {
    EconomicOutcomeRepository.outcomes.clear();
    EconomicOutcomeRepository.objectives.clear();
    EconomicOutcomeRepository.signals.clear();
    EconomicOutcomeRepository.attributions.clear();
    EconomicOutcomeRepository.decisions.clear();
    EconomicOutcomeRepository.evidence.clear();
  }
  upsertOutcome(x: EconomicOutcome) {
    EconomicOutcomeRepository.outcomes.set(`${x.tenantId}:${x.id}`, x);
    return x;
  }
  listOutcomes(
    tenantId: string,
    filters: Partial<
      Pick<EconomicOutcome, "assetId" | "assetType" | "status">
    > = {},
  ) {
    return [...EconomicOutcomeRepository.outcomes.values()].filter(
      (x) =>
        x.tenantId === tenantId &&
        (!filters.assetId || x.assetId === filters.assetId) &&
        (!filters.assetType || x.assetType === filters.assetType) &&
        (!filters.status || x.status === filters.status),
    );
  }
  upsertObjective(x: BusinessObjective) {
    EconomicOutcomeRepository.objectives.set(`${x.tenantId}:${x.id}`, x);
    return x;
  }
  listObjectives(tenantId: string) {
    return [...EconomicOutcomeRepository.objectives.values()].filter(
      (x) => x.tenantId === tenantId,
    );
  }
  upsertSignal(x: ValueSignal) {
    EconomicOutcomeRepository.signals.set(`${x.tenantId}:${x.id}`, x);
    return x;
  }
  listSignals(tenantId: string, assetId?: string) {
    return [...EconomicOutcomeRepository.signals.values()].filter(
      (x) => x.tenantId === tenantId && (!assetId || x.assetId === assetId),
    );
  }
  upsertAttribution(x: OutcomeAttribution) {
    EconomicOutcomeRepository.attributions.set(`${x.tenantId}:${x.id}`, x);
    return x;
  }
  listAttributions(tenantId: string, assetId?: string) {
    return [...EconomicOutcomeRepository.attributions.values()].filter(
      (x) => x.tenantId === tenantId && (!assetId || x.assetId === assetId),
    );
  }
  upsertDecision(x: EconomicDecision) {
    EconomicOutcomeRepository.decisions.set(`${x.tenantId}:${x.id}`, x);
    return x;
  }
  listDecisions(tenantId: string, assetId?: string) {
    return [...EconomicOutcomeRepository.decisions.values()].filter(
      (x) => x.tenantId === tenantId && (!assetId || x.assetId === assetId),
    );
  }
  addEvidence(x: EconomicEvidence) {
    EconomicOutcomeRepository.evidence.set(`${x.tenantId}:${x.id}`, x);
    return x;
  }
  listEvidence(tenantId: string, entityId?: string) {
    return [...EconomicOutcomeRepository.evidence.values()].filter(
      (x) => x.tenantId === tenantId && (!entityId || x.entityId === entityId),
    );
  }
}

export class EconomicOutcomeAttributionService {
  constructor(private readonly repo = new EconomicOutcomeRepository()) {}
  clearForTests() {
    this.repo.clearForTests();
  }
  createEconomicOutcome(
    input: Omit<Partial<EconomicOutcome>, "createdAt" | "updatedAt"> & {
      tenantId: string;
      assetId: string;
      assetType: AssetType;
      name: string;
    },
  ): EconomicOutcome {
    assertInScope(input);
    const ts = now();
    return this.repo.upsertOutcome({
      id: input.id ?? id("outcome", input.tenantId, input.assetId, input.name),
      tenantId: input.tenantId,
      assetId: input.assetId,
      assetType: input.assetType,
      outcomeType: input.outcomeType ?? "UNKNOWN",
      name: input.name,
      description: input.description,
      businessOwnerId: input.businessOwnerId,
      department: input.department,
      costCentre: input.costCentre,
      status: input.status ?? "PROPOSED",
      measurementConfidence: input.measurementConfidence ?? "UNKNOWN",
      expectedValue: input.expectedValue,
      measuredValue: input.measuredValue,
      currency: input.currency ?? "USD",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      source: input.source ?? "MANUAL",
      metadata: input.metadata ?? {},
      createdAt: ts,
      updatedAt: ts,
    });
  }
  listEconomicOutcomes(
    tenantId: string,
    filters: Partial<
      Pick<EconomicOutcome, "assetId" | "assetType" | "status">
    > = {},
  ) {
    return this.repo.listOutcomes(tenantId, filters);
  }
  createBusinessObjective(
    input: Omit<Partial<BusinessObjective>, "createdAt" | "updatedAt"> & {
      tenantId: string;
      name: string;
      linkedAssetIds?: string[];
    },
  ): BusinessObjective {
    assertInScope(input);
    const ts = now();
    return this.repo.upsertObjective({
      id: input.id ?? id("objective", input.tenantId, input.name),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      department: input.department,
      linkedAssetIds: input.linkedAssetIds ?? [],
      targetMetric: input.targetMetric,
      targetValue: input.targetValue,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: input.status ?? "UNKNOWN",
      createdAt: ts,
      updatedAt: ts,
    });
  }
  listBusinessObjectives(tenantId: string) {
    return this.repo.listObjectives(tenantId);
  }
  createValueSignal(
    input: Omit<Partial<ValueSignal>, "createdAt"> & {
      tenantId: string;
      assetId: string;
      signalType: ValueSignal["signalType"];
      value: number;
      unit: ValueSignal["unit"];
    },
  ): ValueSignal {
    assertInScope(input);
    const ts = now();
    const signal = this.repo.upsertSignal({
      id:
        input.id ??
        id(
          "signal",
          input.tenantId,
          input.assetId,
          input.signalType,
          String(input.value),
        ),
      tenantId: input.tenantId,
      assetId: input.assetId,
      outcomeId: input.outcomeId,
      signalType: input.signalType,
      value: input.value,
      unit: input.unit,
      confidence: input.confidence ?? "UNKNOWN",
      evidenceRef: input.evidenceRef,
      source: input.source ?? "MANUAL",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      createdAt: ts,
    });
    const evidence = this.evidence(
      input.tenantId,
      signal.id,
      "VALUE_SIGNAL_CAPTURED",
      { signal },
    );
    signal.evidenceRef = evidence.id;
    return signal;
  }
  listValueSignals(tenantId: string, assetId?: string) {
    return this.repo.listSignals(tenantId, assetId);
  }
  attributeOutcomeToAsset(input: {
    tenantId: string;
    assetId: string;
    outcomeId: string;
    attributionMethod?: OutcomeAttribution["attributionMethod"];
    attributionConfidence?: Confidence;
    attributedValue?: number;
    evidenceIds?: string[];
  }): OutcomeAttribution {
    assertInScope(input);
    const outcome = this.repo
      .listOutcomes(input.tenantId, { assetId: input.assetId })
      .find((x) => x.id === input.outcomeId);
    const signals = this.repo
      .listSignals(input.tenantId, input.assetId)
      .filter((x) => !x.outcomeId || x.outcomeId === input.outcomeId);
    const value =
      input.attributedValue ??
      outcome?.measuredValue ??
      signals.reduce((sum, s) => sum + (s.unit === "DOLLARS" ? s.value : 0), 0);
    const cost = this.assetCost(input.tenantId, input.assetId);
    const ratio = cost > 0 ? value / cost : undefined;
    const ts = now();
    const evidenceIds = [
      ...(input.evidenceIds ?? []),
      ...signals
        .map((s) => s.evidenceRef)
        .filter((x): x is string => Boolean(x)),
    ];
    const attribution = this.repo.upsertAttribution({
      id: id("attrib", input.tenantId, input.assetId, input.outcomeId),
      tenantId: input.tenantId,
      assetId: input.assetId,
      outcomeId: input.outcomeId,
      attributionMethod:
        input.attributionMethod ??
        (signals.length ? "USAGE_CORRELATED" : "UNKNOWN"),
      attributionConfidence:
        input.attributionConfidence ??
        strongest(signals.map((s) => s.confidence)),
      attributedValue: value,
      attributedCost: cost,
      netValue: value - cost,
      valueToCostRatio: ratio,
      evidenceIds,
      createdAt: ts,
      updatedAt: ts,
    });
    this.evidence(
      input.tenantId,
      attribution.id,
      "OUTCOME_ATTRIBUTED_TO_ASSET",
      { attribution },
    );
    return attribution;
  }
  generateEconomicDecision(
    tenantId: string,
    assetId: string,
  ): EconomicDecision {
    const summary = this.getAssetOutcomeSummary(tenantId, assetId);
    const ratio = summary.valueToCostRatio;
    let decision: EconomicDecisionType = "INSUFFICIENT_EVIDENCE";
    let reason = "No outcome or value signal exists";
    let confidence: Confidence = summary.attributionConfidence;
    if (summary.outcomes.length === 0 && summary.valueSignals.length === 0) {
      decision = summary.spend > 0 ? "REVIEW" : "INSUFFICIENT_EVIDENCE";
      reason =
        summary.spend > 0
          ? "Spend exists but no value signal is captured"
          : reason;
    } else if (
      summary.isUnused &&
      summary.spend >= 500 &&
      summary.measuredValue === 0
    ) {
      decision = "RETIRE";
      reason = "Asset is unused, high-cost, and has no measured value";
    } else if (confidence === "LOW") {
      decision = "REVIEW";
      reason = "Attribution confidence is low";
    } else if (
      ratio !== undefined &&
      ratio >= 2 &&
      ["MEDIUM", "HIGH"].includes(confidence)
    ) {
      decision = "EXPAND";
      reason = "Value-to-cost ratio is at least 2.0 with sufficient confidence";
    } else if (ratio !== undefined && ratio >= 1) {
      decision = "KEEP";
      reason = "Value-to-cost ratio is at least 1.0";
    } else if (ratio !== undefined && ratio > 0) {
      decision = "OPTIMISE";
      reason = "Positive value exists but value-to-cost ratio is below 1.0";
    } else if (summary.spend > 0) {
      decision = "REVIEW";
      reason = "Spend exists without sufficient measured value";
    }
    const out = this.repo.upsertDecision({
      id: id(
        "decision",
        tenantId,
        assetId,
        decision,
        String(summary.measuredValue),
        String(summary.spend),
      ),
      tenantId,
      assetId,
      decision,
      reason,
      confidence,
      cost: summary.spend,
      measuredValue: summary.measuredValue,
      netValue: summary.netValue,
      valueToCostRatio: ratio,
      relatedOutcomeIds: summary.outcomes.map((x) => x.id),
      relatedRecommendationIds: summary.relatedRecommendationIds,
      evidenceIds: summary.evidenceIds,
      createdAt: now(),
    });
    this.evidence(tenantId, out.id, "ECONOMIC_DECISION_CREATED", {
      decision: out,
    });
    return out;
  }
  getAssetOutcomeSummary(tenantId: string, assetId: string) {
    const asset = aiIntelligenceService.getAsset(tenantId, assetId);
    const usage = aiIntelligenceService
      .listUsage(tenantId)
      .records.filter((x) => x.assetId === assetId);
    const spend = this.assetCost(tenantId, assetId);
    const outcomes = this.repo.listOutcomes(tenantId, { assetId });
    const valueSignals = this.repo.listSignals(tenantId, assetId);
    const attributions = this.repo.listAttributions(tenantId, assetId);
    const measuredValue =
      attributions.reduce(
        (sum, x) => sum + Number(x.attributedValue ?? 0),
        0,
      ) ||
      outcomes.reduce((sum, x) => sum + Number(x.measuredValue ?? 0), 0) ||
      valueSignals
        .filter((x) => x.unit === "DOLLARS")
        .reduce((sum, x) => sum + x.value, 0);
    const netValue = measuredValue - spend;
    const ratio = spend > 0 ? measuredValue / spend : undefined;
    const usageCount = usage.reduce(
      (sum, x) => sum + x.requestCount + x.executionCount + x.userCount,
      0,
    );
    const latestDecision = this.repo.listDecisions(tenantId, assetId).at(-1);
    const evidenceIds = [
      ...valueSignals
        .map((s) => s.evidenceRef)
        .filter((x): x is string => Boolean(x)),
      ...attributions.flatMap((a) => a.evidenceIds),
    ];
    return {
      tenantId,
      assetId,
      asset,
      owner: asset?.ownerId ?? "Unassigned",
      usage,
      usageCount,
      spend,
      outcomes,
      valueSignals,
      attributions,
      attributionConfidence: strongest([
        ...valueSignals.map((x) => x.confidence),
        ...attributions.map((x) => x.attributionConfidence),
      ]),
      measuredValue,
      netValue,
      valueToCostRatio: ratio,
      decision: latestDecision?.decision ?? "INSUFFICIENT_EVIDENCE",
      confidence: latestDecision?.confidence ?? "UNKNOWN",
      evidenceCount: evidenceIds.length,
      evidenceIds,
      isUnused: usageCount === 0,
      relatedRecommendationIds: aiIntelligenceService
        .recommendations(tenantId)
        .filter((r) => r.assetId === assetId)
        .map((r) => r.id),
    };
  }
  getEconomicOutcomesDashboard(tenantId: string) {
    const outcomes = this.repo.listOutcomes(tenantId);
    const attributions = this.repo.listAttributions(tenantId);
    const decisions = this.repo.listDecisions(tenantId);
    const assetIds = [
      ...new Set([
        ...outcomes.map((x) => x.assetId),
        ...aiIntelligenceService.listAssets(tenantId).map((x) => x.id),
      ]),
    ];
    const summaries = assetIds.map((assetId) =>
      this.getAssetOutcomeSummary(tenantId, assetId),
    );
    const totalValue = attributions.reduce(
      (sum, x) => sum + Number(x.attributedValue ?? 0),
      0,
    );
    const totalCost = summaries.reduce((sum, x) => sum + x.spend, 0);
    return {
      tenantId,
      summary: {
        totalOutcomes: outcomes.length,
        measuredOutcomes: outcomes.filter((x) => x.status === "MEASURED")
          .length,
        unprovenOutcomes: outcomes.filter(
          (x) =>
            x.status === "UNPROVEN" ||
            x.measurementConfidence === "LOW" ||
            x.measurementConfidence === "UNKNOWN",
        ).length,
        totalAttributedValue: totalValue,
        totalAttributedCost: totalCost,
        netValue: totalValue - totalCost,
        assetsWithInsufficientEvidence: summaries.filter(
          (x) => x.decision === "INSUFFICIENT_EVIDENCE",
        ).length,
        keepCount: decisions.filter((x) => x.decision === "KEEP").length,
        optimiseCount: decisions.filter((x) => x.decision === "OPTIMISE")
          .length,
        expandCount: decisions.filter((x) => x.decision === "EXPAND").length,
        retireCount: decisions.filter((x) => x.decision === "RETIRE").length,
      },
      topValueProducingAssets: summaries
        .sort((a, b) => b.measuredValue - a.measuredValue)
        .slice(0, 5),
      highCostLowValueAssets: summaries.filter(
        (x) => x.spend >= 500 && x.measuredValue < x.spend,
      ),
      recentEconomicDecisions: decisions.slice(-10).reverse(),
      assetSummaries: summaries,
      outcomes,
      valueSignals: this.repo.listSignals(tenantId),
    };
  }
  private assetCost(tenantId: string, assetId: string) {
    return aiIntelligenceService
      .listSpend(tenantId)
      .records.filter((x) => x.assetId === assetId)
      .reduce((sum, x) => sum + x.totalSpend, 0);
  }
  private evidence(
    tenantId: string,
    entityId: string,
    eventType: EconomicEvidence["eventType"],
    payload: Record<string, unknown>,
  ) {
    const evidence = this.repo.addEvidence({
      id: id(
        "evidence",
        tenantId,
        entityId,
        eventType,
        JSON.stringify(payload),
      ),
      tenantId,
      entityId,
      eventType,
      payload,
      createdAt: now(),
    });
    void platformEventService
      .recordNormalizedEvent({
        tenantId,
        category: "OUTCOME",
        type: eventType,
        eventId: randomUUID(),
        entityType: "EconomicOutcome",
        entityId,
        evidenceRef: evidence.id,
        sourceSystem: "economic-outcome-attribution",
        metadata: payload,
      })
      .catch(() => undefined);
    return evidence;
  }
  listEvidence(tenantId: string, entityId?: string) {
    return this.repo.listEvidence(tenantId, entityId);
  }
}
function strongest(values: Confidence[]): Confidence {
  const max = Math.max(0, ...values.map(confidenceRank));
  return max >= 3 ? "HIGH" : max >= 2 ? "MEDIUM" : max >= 1 ? "LOW" : "UNKNOWN";
}
export const economicOutcomeAttributionService =
  new EconomicOutcomeAttributionService();
export const createEconomicOutcome =
  economicOutcomeAttributionService.createEconomicOutcome.bind(
    economicOutcomeAttributionService,
  );
export const listEconomicOutcomes =
  economicOutcomeAttributionService.listEconomicOutcomes.bind(
    economicOutcomeAttributionService,
  );
export const createBusinessObjective =
  economicOutcomeAttributionService.createBusinessObjective.bind(
    economicOutcomeAttributionService,
  );
export const createValueSignal =
  economicOutcomeAttributionService.createValueSignal.bind(
    economicOutcomeAttributionService,
  );
export const attributeOutcomeToAsset =
  economicOutcomeAttributionService.attributeOutcomeToAsset.bind(
    economicOutcomeAttributionService,
  );
export const generateEconomicDecision =
  economicOutcomeAttributionService.generateEconomicDecision.bind(
    economicOutcomeAttributionService,
  );
export const getAssetOutcomeSummary =
  economicOutcomeAttributionService.getAssetOutcomeSummary.bind(
    economicOutcomeAttributionService,
  );
export const getEconomicOutcomesDashboard =
  economicOutcomeAttributionService.getEconomicOutcomesDashboard.bind(
    economicOutcomeAttributionService,
  );
