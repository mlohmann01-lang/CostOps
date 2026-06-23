// Program E1 — AI Economics Authority. Capability 1: canonical economics model.
//
// Answers "what did that value cost?" by joining AI3's value graph with real
// spend (ai-economic-control) and real attributed value (AI1). Never
// fabricates spend or value, never computes ROI when value is unknown.

export type AIEconomicsReadiness = 'READY' | 'PARTIAL' | 'NOT_READY';
export type AIEconomicsConfidence = 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED';

export type AIEconomicsSubjectType = 'INITIATIVE' | 'AI_ASSET' | 'AI_MODEL' | 'AI_AGENT' | 'WORKFLOW' | 'VENDOR';

export interface AIEconomicsMetric {
  id: string;
  tenantId: string;
  subjectType: AIEconomicsSubjectType;
  subjectId: string;

  spendAmount?: number;
  spendCurrency?: string;

  outcomeCount: number;
  valueSignalCount: number;
  evidenceCount: number;

  knownValueAmount?: number;
  knownValueCurrency?: string;

  costPerOutcome?: number;
  costPerValueSignal?: number;
  roiRatio?: number;

  confidenceScore: number;
  confidenceLevel: AIEconomicsConfidence;

  readiness: AIEconomicsReadiness;

  unknowns: string[];

  evidenceIds: string[];

  generatedAt: string;
}

export interface AIEconomicsGraphSummary {
  tenantId: string;
  totalInitiatives: number;
  initiativesWithSpend: number;
  initiativesWithValue: number;
  initiativesWithROI: number;
  averageCostPerOutcome?: number;
  averageConfidence: number;
  readyCount: number;
  partialCount: number;
  notReadyCount: number;
  unknownSpendCount: number;
  unknownValueCount: number;
  generatedAt: string;
}

export interface AIEconomicsAuthorityResult {
  authority: 'AI_ECONOMICS_AUTHORITY';
  tenantId: string;
  verdict: AIEconomicsReadiness;
  score: number;
  spendCoverage: { total: number; withSpend: number; ratio: number };
  valueCoverage: { total: number; withValue: number; ratio: number };
  roiCoverage: { total: number; withROI: number; ratio: number };
  unitEconomicsCoverage: { total: number; withCostPerOutcome: number; ratio: number };
  confidenceCoverage: { averageConfidence: number };
  unknownEconomicsCount: number;
  graphDependencyHealth: { graphReadiness: string; graphCompletenessScore: number };
  reasoning: string;
}
