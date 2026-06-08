import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  aiIntelligenceRepository,
  aiIntelligenceService,
} from "../lib/ai-economic-control/ai-intelligence";
import { economicOutcomeAttributionService } from "../lib/economic-outcomes/economic-outcome-attribution";

const tenantId = "tenant-outcomes";

function reset() {
  aiIntelligenceRepository.clearForTests();
  economicOutcomeAttributionService.clearForTests();
}

function createAIAsset(name = "Outcome Support Model") {
  return aiIntelligenceService.createAsset(tenantId, {
    name,
    assetType: "MODEL",
    vendor: "OpenAI",
    ownerId: "owner-1",
    approvalStatus: "APPROVED",
    costCentre: "CC-AI",
    status: "ACTIVE",
  });
}

test("economic outcomes can be created and listed", () => {
  reset();
  const asset = createAIAsset();
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({
    tenantId,
    assetId: asset.id,
    assetType: "AI_ASSET",
    outcomeType: "PRODUCTIVITY",
    name: "Reduce support handling time",
    status: "ACTIVE",
    measurementConfidence: "MEDIUM",
    expectedValue: 50000,
  });
  const listed = economicOutcomeAttributionService.listEconomicOutcomes(
    tenantId,
    { assetId: asset.id },
  );
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, outcome.id);
  assert.equal(listed[0].assetType, "AI_ASSET");
});

test("business objectives can be created and linked to assets", () => {
  reset();
  const asset = createAIAsset("Objective Linked Model");
  const objective = economicOutcomeAttributionService.createBusinessObjective({
    tenantId,
    name: "Support productivity improvement",
    ownerId: "vp-support",
    linkedAssetIds: [asset.id],
    targetMetric: "hours_saved",
    targetValue: 1000,
    status: "ACTIVE",
  });
  assert.deepEqual(objective.linkedAssetIds, [asset.id]);
  assert.ok(
    economicOutcomeAttributionService
      .listBusinessObjectives(tenantId)
      .some((item) => item.id === objective.id),
  );
});

test("value signals can be created and linked to assets and outcomes with evidence", () => {
  reset();
  const asset = createAIAsset("Value Signal Model");
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({
    tenantId,
    assetId: asset.id,
    assetType: "AI_ASSET",
    name: "Automate support tasks",
    outcomeType: "PRODUCTIVITY",
  });
  const signal = economicOutcomeAttributionService.createValueSignal({
    tenantId,
    assetId: asset.id,
    outcomeId: outcome.id,
    signalType: "TIME_SAVED",
    value: 120,
    unit: "HOURS",
    confidence: "HIGH",
    source: "SYSTEM",
  });
  assert.equal(signal.assetId, asset.id);
  assert.equal(signal.outcomeId, outcome.id);
  assert.ok(signal.evidenceRef);
  assert.ok(
    economicOutcomeAttributionService
      .listEvidence(tenantId)
      .some((item) => item.eventType === "VALUE_SIGNAL_CAPTURED"),
  );
});

test("outcomes can be attributed to AI assets and calculate cost value net value and ratio", () => {
  reset();
  const asset = createAIAsset("Attribution Model");
  aiIntelligenceService.ingestSpend(tenantId, {
    assetId: asset.id,
    totalSpend: 1000,
    tokenSpend: 1000,
  });
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({
    tenantId,
    assetId: asset.id,
    assetType: "AI_ASSET",
    name: "Deflect support tickets",
    outcomeType: "COST_REDUCTION",
    measuredValue: 2500,
    status: "MEASURED",
    measurementConfidence: "HIGH",
  });
  const attribution = economicOutcomeAttributionService.attributeOutcomeToAsset(
    {
      tenantId,
      assetId: asset.id,
      outcomeId: outcome.id,
      attributionMethod: "DIRECT",
      attributionConfidence: "HIGH",
    },
  );
  assert.equal(attribution.attributedCost, 1000);
  assert.equal(attribution.attributedValue, 2500);
  assert.equal(attribution.netValue, 1500);
  assert.equal(attribution.valueToCostRatio, 2.5);
  assert.ok(
    economicOutcomeAttributionService
      .listEvidence(tenantId)
      .some((item) => item.eventType === "OUTCOME_ATTRIBUTED_TO_ASSET"),
  );
});

test("assets with no value signals generate INSUFFICIENT_EVIDENCE", () => {
  reset();
  const asset = createAIAsset("No Evidence Model");
  const decision = economicOutcomeAttributionService.generateEconomicDecision(
    tenantId,
    asset.id,
  );
  assert.equal(decision.decision, "INSUFFICIENT_EVIDENCE");
});

test("assets with high value-to-cost ratio generate EXPAND", () => {
  reset();
  const asset = createAIAsset("Expansion Candidate Model");
  aiIntelligenceService.ingestSpend(tenantId, {
    assetId: asset.id,
    totalSpend: 1000,
  });
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({
    tenantId,
    assetId: asset.id,
    assetType: "AI_ASSET",
    name: "Expand support automation",
    measuredValue: 3000,
    status: "MEASURED",
    measurementConfidence: "HIGH",
  });
  economicOutcomeAttributionService.attributeOutcomeToAsset({
    tenantId,
    assetId: asset.id,
    outcomeId: outcome.id,
    attributionConfidence: "HIGH",
  });
  const decision = economicOutcomeAttributionService.generateEconomicDecision(
    tenantId,
    asset.id,
  );
  assert.equal(decision.decision, "EXPAND");
});

test("assets with positive but weak value-to-cost ratio generate OPTIMISE", () => {
  reset();
  const asset = createAIAsset("Optimise Candidate Workflow");
  aiIntelligenceService.ingestSpend(tenantId, {
    assetId: asset.id,
    totalSpend: 1000,
  });
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({
    tenantId,
    assetId: asset.id,
    assetType: "AI_ASSET",
    name: "Partially automate proposals",
    measuredValue: 400,
    status: "MEASURED",
    measurementConfidence: "MEDIUM",
  });
  economicOutcomeAttributionService.attributeOutcomeToAsset({
    tenantId,
    assetId: asset.id,
    outcomeId: outcome.id,
    attributionConfidence: "MEDIUM",
  });
  const decision = economicOutcomeAttributionService.generateEconomicDecision(
    tenantId,
    asset.id,
  );
  assert.equal(decision.decision, "OPTIMISE");
});

test("unused high-cost no-value assets generate RETIRE", () => {
  reset();
  const asset = createAIAsset("Dormant Expensive Agent");
  aiIntelligenceService.ingestSpend(tenantId, {
    assetId: asset.id,
    totalSpend: 2500,
  });
  economicOutcomeAttributionService.createEconomicOutcome({
    tenantId,
    assetId: asset.id,
    assetType: "AI_ASSET",
    name: "Legacy workflow automation",
    measuredValue: 0,
    status: "UNPROVEN",
    measurementConfidence: "MEDIUM",
  });
  const decision = economicOutcomeAttributionService.generateEconomicDecision(
    tenantId,
    asset.id,
  );
  assert.equal(decision.decision, "RETIRE");
});

test("economic decisions create outcome ledger evidence and summaries include integrated AI context", () => {
  reset();
  const asset = createAIAsset("Summary Model");
  aiIntelligenceService.ingestUsage(tenantId, {
    assetId: asset.id,
    requestCount: 200,
    userCount: 10,
  });
  aiIntelligenceService.ingestSpend(tenantId, {
    assetId: asset.id,
    totalSpend: 1000,
  });
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({
    tenantId,
    assetId: asset.id,
    assetType: "AI_ASSET",
    name: "Improve analyst throughput",
    measuredValue: 2000,
    status: "MEASURED",
    measurementConfidence: "HIGH",
  });
  economicOutcomeAttributionService.createValueSignal({
    tenantId,
    assetId: asset.id,
    outcomeId: outcome.id,
    signalType: "COST_AVOIDED",
    value: 2000,
    unit: "DOLLARS",
    confidence: "HIGH",
  });
  economicOutcomeAttributionService.attributeOutcomeToAsset({
    tenantId,
    assetId: asset.id,
    outcomeId: outcome.id,
    attributionConfidence: "HIGH",
  });
  const decision = economicOutcomeAttributionService.generateEconomicDecision(
    tenantId,
    asset.id,
  );
  const summary = economicOutcomeAttributionService.getAssetOutcomeSummary(
    tenantId,
    asset.id,
  );
  assert.ok(["KEEP", "EXPAND"].includes(decision.decision));
  assert.equal(summary.asset?.id, asset.id);
  assert.equal(summary.owner, "owner-1");
  assert.equal(summary.spend, 1000);
  assert.ok(summary.usageCount > 0);
  assert.ok(summary.outcomes.length > 0);
  assert.ok(summary.valueSignals.length > 0);
  assert.ok(summary.evidenceCount > 0);
  assert.ok(
    economicOutcomeAttributionService
      .listEvidence(tenantId)
      .some((item) => item.eventType === "ECONOMIC_DECISION_CREATED"),
  );
});

test("dashboard summarizes economic outcome attribution for executive control", () => {
  reset();
  const asset = createAIAsset("Dashboard Model");
  aiIntelligenceService.ingestSpend(tenantId, {
    assetId: asset.id,
    totalSpend: 1000,
  });
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({
    tenantId,
    assetId: asset.id,
    assetType: "AI_ASSET",
    name: "Dashboard outcome",
    measuredValue: 2500,
    status: "MEASURED",
    measurementConfidence: "HIGH",
  });
  economicOutcomeAttributionService.attributeOutcomeToAsset({
    tenantId,
    assetId: asset.id,
    outcomeId: outcome.id,
    attributionConfidence: "HIGH",
  });
  economicOutcomeAttributionService.generateEconomicDecision(
    tenantId,
    asset.id,
  );
  const dashboard =
    economicOutcomeAttributionService.getEconomicOutcomesDashboard(tenantId);
  assert.equal(dashboard.summary.totalOutcomes, 1);
  assert.equal(dashboard.summary.measuredOutcomes, 1);
  assert.equal(dashboard.summary.totalAttributedValue, 2500);
  assert.ok(
    dashboard.topValueProducingAssets.some((item) => item.assetId === asset.id),
  );
  assert.ok(dashboard.recentEconomicDecisions.length > 0);
});

test("no Agent Security Analytics or forbidden adjacent risk objects are introduced", () => {
  const source = fs.readFileSync(
    "src/lib/economic-outcomes/economic-outcome-attribution.ts",
    "utf8",
  );
  for (const forbidden of [
    /Agent Security Analytics/i,
    /LeftShield/i,
    /runtime exploit detection/i,
    /MCP attack path analysis/i,
    /Prompt tracing/i,
    /Autonomous execution/i,
    /Digital twin simulation/i,
  ])
    assert.equal(forbidden.test(source), false);
  assert.throws(
    () =>
      economicOutcomeAttributionService.createEconomicOutcome({
        tenantId,
        assetId: "asset",
        assetType: "AI_ASSET",
        name: "Forbidden",
        metadata: { note: "runtime security exploit" },
      }),
    /ECONOMIC_OUTCOME_ATTRIBUTION_ONLY/,
  );
});
