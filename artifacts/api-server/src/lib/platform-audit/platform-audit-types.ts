export type RealityLevel = 'LIVE' | 'PARTIAL' | 'MOCK' | 'STUB' | 'NOT_SUPPORTED';

export type CoverageStatus = 'COMPLETE' | 'PARTIAL' | 'PLANNED' | 'STUB';

export type LineageLinkStatus = 'COMPLETE' | 'INFERRED' | 'MISSING' | 'BROKEN';

export type DemoReality = 'LIVE_ONLY' | 'LIVE_WITH_EMPTY_STATE' | 'DEMO_CAPABLE' | 'DEMO_ONLY';

export type AuthorityMaturity = 'READY' | 'PARTIAL' | 'FOUNDATIONAL';

export type DebtSeverity = 'MUST_FIX' | 'SHOULD_FIX' | 'ACCEPTED_DEBT';

export type Pillar = 'AUTO_EXECUTION' | 'VALUE_REALISATION' | 'PROTECTED_GOVERNANCE' | 'SHARED_PLATFORM';

export interface ConnectorRealityEntry {
  connector: string;
  discovery: RealityLevel;
  execution: RealityLevel;
  verification: RealityLevel;
  protection: RealityLevel;
  notes: string;
}

export interface PillarCoverageEntry {
  capability: string;
  pillar: Pillar;
  status: CoverageStatus;
  notes: string;
}

export interface DecisionLineageEntry {
  source: string;
  investmentToAsset: LineageLinkStatus;
  assetToDecision: LineageLinkStatus;
  decisionToOutcome: LineageLinkStatus;
  outcomeToProtectedValue: LineageLinkStatus;
  notes: string;
}

export interface DemoRealityEntry {
  surface: string;
  kind: 'PAGE' | 'HOOK' | 'ROUTE' | 'DASHBOARD';
  classification: DemoReality;
  notes: string;
}

export interface AuthorityMaturityEntry {
  authority: string;
  schema: AuthorityMaturity;
  apis: AuthorityMaturity;
  tests: AuthorityMaturity;
  uiExposure: AuthorityMaturity;
  proofPackExposure: AuthorityMaturity;
  productionReadiness: AuthorityMaturity;
  notes: string;
}

export interface TechnicalDebtEntry {
  id: string;
  area: string;
  severity: DebtSeverity;
  description: string;
  recommendation: string;
}

export interface PillarStoryReadinessEntry {
  pillar: Pillar;
  exampleConnector: string;
  evidenceAvailable: boolean;
  proofAvailable: boolean;
  uiAvailable: boolean;
  dataLineageAvailable: boolean;
  notes: string;
}

export type ReadinessCategory =
  | 'CONTROL_ENGINE'
  | 'CANONICAL_MODEL'
  | 'USER_EXPERIENCE'
  | 'PROOF_AND_AUDITABILITY'
  | 'CONNECTOR_REALITY'
  | 'EXECUTIVE_STORY';

export interface ReadinessCategoryScore {
  category: ReadinessCategory;
  score: number;
  rationale: string;
  blockers: string[];
}

export interface PlatformReadinessReport {
  overallScore: number;
  categories: ReadinessCategoryScore[];
  blockers: string[];
  nextActions: string[];
}
