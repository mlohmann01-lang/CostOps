// Program EX3 — Scenario Planning. Capability 1: canonical scenario model.
//
// Answers "what happens if we do this?" by deriving every impact count
// directly from the existing Technology Value Graph (X1/X2), Technology
// Economics (X3) and Technology Capital Allocation (X4) authorities. No
// revenue forecasting, no fabricated savings or impact — every count below
// must trace back to a real graph edge or an existing recommendation.

export type ScenarioType =
  | 'RETIRE'
  | 'RENEW'
  | 'OPTIMISE'
  | 'EXPAND'
  | 'CONSOLIDATE'
  | 'DO_NOTHING';

export type ScenarioSubjectType =
  | 'TECHNOLOGY'
  | 'AI'
  | 'VENDOR'
  | 'CAPABILITY';

export interface ScenarioAnalysis {
  id: string;

  tenantId: string;

  scenarioType: ScenarioType;

  subjectType: ScenarioSubjectType;

  subjectId: string;

  impactedAssets: number;

  impactedCapabilities: number;

  impactedObjectives: number;

  impactedOutcomes: number;

  impactedRenewals: number;

  impactedRecommendations: number;

  confidence: string;

  readiness: string;

  assumptions: string[];

  evidenceIds: string[];

  generatedAt: string;
}

export interface ScenarioPortfolioEntry {
  subjectId: string;
  subjectType: ScenarioSubjectType;
  scenarioType: ScenarioType;
  impactScore: number;
  analysis: ScenarioAnalysis;
}

export interface ScenarioPortfolioView {
  tenantId: string;
  mostImpactfulRetirements: ScenarioPortfolioEntry[];
  mostImpactfulRenewals: ScenarioPortfolioEntry[];
  mostImpactfulExpansions: ScenarioPortfolioEntry[];
  mostImpactfulConsolidations: ScenarioPortfolioEntry[];
  generatedAt: string;
}

export type ScenarioPlanningVerdict = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface ScenarioPlanningAuthorityResult {
  authority: 'SCENARIO_PLANNING_AUTHORITY';
  tenantId: string;
  verdict: ScenarioPlanningVerdict;
  score: number;
  graphCoverage: { graphReadiness: string; graphCompletenessScore: number };
  economicsCoverage: { total: number; withEconomics: number; ratio: number };
  decisionCoverage: { total: number; withDecision: number; ratio: number };
  scenarioCoverage: { total: number; withScenario: number; ratio: number };
  reasoning: string;
}
