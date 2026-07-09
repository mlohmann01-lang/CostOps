// Program X3 — Technology Economics Authority. Capability 1: canonical
// economics model.
//
// Answers "what did that technology cost, and what value did it create?" by
// joining the Technology Investment Graph (X1/X2) with real spend (Technology
// Portfolio Authority) and real attributed value (Economic Outcome
// Attribution). Never fabricates spend or value, never computes ROI when
// value is unknown.

export type TechnologyEconomicsSubjectType =
  | 'TECHNOLOGY_ASSET'
  | 'SAAS_APPLICATION'
  | 'CLOUD_SERVICE'
  | 'DATA_PLATFORM'
  | 'AI_SYSTEM'
  | 'SECURITY_PLATFORM'
  | 'BUSINESS_CAPABILITY'
  | 'VENDOR'
  | 'CONTRACT';

export type TechnologyEconomicsReadiness = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface TechnologyEconomicsMetric {
  id: string;
  tenantId: string;
  subjectType: TechnologyEconomicsSubjectType;
  subjectId: string;

  spendAmount?: number;
  spendCurrency?: string;

  knownValueAmount?: number;
  knownValueCurrency?: string;

  outcomeCount: number;
  capabilityCount: number;
  objectiveCount: number;
  evidenceCount: number;

  costPerOutcome?: number;
  costPerCapability?: number;
  roiRatio?: number;

  confidenceScore: number;

  readiness: TechnologyEconomicsReadiness;

  unknowns: string[];

  generatedAt: string;
}

export interface TechnologyEconomicsSummary {
  tenantId: string;
  totalTechnologies: number;
  assetsWithSpend: number;
  assetsWithValue: number;
  assetsWithROI: number;
  averageCostPerOutcome?: number;
  averageConfidence: number;
  unknownSpendCount: number;
  unknownValueCount: number;
  generatedAt: string;
}

export interface TechnologyEconomicsAuthorityResult {
  authority: 'TECHNOLOGY_ECONOMICS_AUTHORITY';
  tenantId: string;
  verdict: TechnologyEconomicsReadiness;
  score: number;
  spendCoverage: { total: number; withSpend: number; ratio: number };
  valueCoverage: { total: number; withValue: number; ratio: number };
  outcomeCoverage: { total: number; withOutcomes: number; ratio: number };
  economicsCoverage: { total: number; withCostPerOutcome: number; ratio: number };
  confidenceCoverage: { averageConfidence: number };
  unknownEconomicsCount: number;
  graphDependencyHealth: { graphReadiness: string; graphCompletenessScore: number };
  reasoning: string;
}
