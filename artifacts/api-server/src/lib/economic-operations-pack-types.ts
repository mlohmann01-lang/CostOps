/**
 * economic-operations-pack-types.ts
 *
 * Canonical type system for the Economic Operations Pack Factory.
 * These types form the declarative foundation that compiles into the operational spine.
 *
 * Aligns with:
 *   - ExecutionIntentType from economic-operations-intent-service.ts
 *   - Permission, OperatorRole from economic-operations-rbac.ts
 *   - ConnectorId, ConnectorCapability, BaseConnector from connectors/sdk.ts
 *   - OperationalizationPack from operationalization/packs/base-pack.ts
 */

import type { ConnectorId, ConnectorCapability } from './connectors/sdk.js';
import type { Permission, OperatorRole } from './economic-operations-rbac.js';
import type { ExecutionIntentType, TenantOperationalMode } from './economic-operations-intent-service.js';

// ---------------------------------------------------------------------------
// Core classification enumerations
// ---------------------------------------------------------------------------

export type PackDomain =
  | 'M365'
  | 'AI_GOVERNANCE'
  | 'CLOUD'
  | 'SAAS'
  | 'SNOWFLAKE'
  | 'DATABRICKS'
  | 'ORACLE';

export type PackCategory =
  | 'LICENSE_RECLAIM'
  | 'TOKEN_GOVERNANCE'
  | 'MODEL_ROUTING'
  | 'VENDOR_GOVERNANCE'
  | 'AGENT_RUNTIME_GOVERNANCE'
  | 'CONTEXT_GOVERNANCE'
  | 'ROI_GOVERNANCE'
  | 'DRIFT_GOVERNANCE'
  | 'OVERLAP_ELIMINATION'
  | 'COST_OPTIMIZATION'
  | 'SEAT_MANAGEMENT';

export type BlastRadiusClassification = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskProfile = 'LOW' | 'MEDIUM' | 'HIGH';

export type PackExecutionMode =
  | 'SIMULATION_ONLY'
  | 'GOVERNED_EXECUTION'
  | 'FULLY_AUTOMATED';

export type PackApprovalPolicy =
  | 'NONE'
  | 'SINGLE_APPROVER'
  | 'DUAL_APPROVAL'
  | 'COMMITTEE';

/**
 * Minimum tenant operational mode required before this pack may execute.
 * Maps to the subset of TenantOperationalMode values that are pack-relevant.
 */
export type PackTenantMode =
  | 'PILOT_READ_ONLY'
  | 'PRODUCTION_APPROVAL_REQUIRED'
  | 'PRODUCTION_GOVERNED_EXECUTION';

// ---------------------------------------------------------------------------
// Connector scope descriptor
// ---------------------------------------------------------------------------

/**
 * Describes the required access scope on a specific connector.
 */
export interface PackConnectorScope {
  readonly connectorId: ConnectorId;
  readonly requiredCapabilities: readonly ConnectorCapability[];
  /** Human-readable reason this connector scope is needed. */
  readonly rationale: string;
}

// ---------------------------------------------------------------------------
// Generic subsystem interface contracts
// ---------------------------------------------------------------------------

/**
 * Collects raw evidence from upstream data sources for a given tenant.
 * TEvidence is the domain-specific evidence shape the pack operates on.
 */
export interface PackEvidenceCollector<TEvidence> {
  collect(tenantId: string, context: Record<string, unknown>): Promise<TEvidence>;
}

/**
 * Normalises raw connector/source data into the canonical TEvidence shape.
 */
export interface PackEvidenceNormalizer<TRaw, TEvidence> {
  normalize(raw: TRaw): TEvidence;
}

/**
 * Derives typed recommendations from collected evidence.
 */
export interface PackRecommendationGenerator<TEvidence, TRecommendation> {
  generate(tenantId: string, evidence: TEvidence): Promise<TRecommendation[]>;
}

/**
 * Computes a trust score (0–1) expressing confidence in the evidence quality.
 */
export interface PackTrustScorer<TEvidence> {
  score(evidence: TEvidence): number;
  /** Optional threshold below which execution should be blocked. */
  readonly minimumTrustThreshold: number;
}

/**
 * Projects savings figures from evidence prior to execution.
 */
export interface PackSavingsEstimator<TEvidence> {
  estimateMonthlySavings(evidence: TEvidence): number;
  estimateAnnualSavings(evidence: TEvidence): number;
  confidence(evidence: TEvidence): number;
}

/**
 * Generates a deterministic simulation of what execution would produce.
 */
export interface PackSimulationGenerator<TEvidence, TSimulation> {
  simulate(tenantId: string, executionId: string, evidence: TEvidence): Promise<TSimulation>;
}

/**
 * Executes the pack's operational payload against real infrastructure.
 */
export interface PackExecutionAdapter<TPayload, TResult> {
  execute(tenantId: string, executionId: string, payload: TPayload): Promise<TResult>;
}

/**
 * Rolls back a previously executed operation.
 */
export interface PackRollbackAdapter<TPayload> {
  rollback(tenantId: string, executionId: string, payload: TPayload): Promise<void>;
}

/**
 * Verifies that execution produced the expected outcome.
 */
export interface PackVerificationStrategy<TResult> {
  verify(
    tenantId: string,
    executionId: string,
    expected: TResult,
  ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }>;
}

/**
 * A single drift detection rule that can be evaluated post-execution.
 */
export interface PackDriftDetectionRule {
  readonly ruleId: string;
  readonly description: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evaluate(
    tenantId: string,
    executionId: string,
    context: Record<string, unknown>,
  ): Promise<{ triggered: boolean; detail: string }>;
}

// ---------------------------------------------------------------------------
// UX metadata
// ---------------------------------------------------------------------------

/**
 * Display-layer metadata consumed by the UI to render pack cards and flows.
 */
export interface PackUXMetadata {
  readonly displayName: string;
  readonly shortDescription: string;
  readonly longDescription: string;
  readonly iconSlug: string;
  /** Colour token used for the domain badge, e.g. "blue-600". */
  readonly domainColour: string;
  readonly estimatedTimeToValueDays: number;
  readonly documentationUrl: string | null;
  readonly tags: readonly string[];
  /** Feature flags that must be enabled for this pack to appear in the UI. */
  readonly requiredFeatureFlags: readonly string[];
}

// ---------------------------------------------------------------------------
// Evidence layer descriptor
// ---------------------------------------------------------------------------

export interface PackEvidenceLayer<TRaw, TEvidence> {
  readonly collector: PackEvidenceCollector<TEvidence>;
  readonly normalizer: PackEvidenceNormalizer<TRaw, TEvidence>;
  readonly trustScorer: PackTrustScorer<TEvidence>;
  readonly savingsEstimator: PackSavingsEstimator<TEvidence>;
}

// ---------------------------------------------------------------------------
// Recommendation layer descriptor
// ---------------------------------------------------------------------------

export interface PackRecommendationLayer<TEvidence, TRecommendation> {
  readonly generator: PackRecommendationGenerator<TEvidence, TRecommendation>;
  /**
   * Maximum number of recommendations to surface per run.
   * undefined = unlimited.
   */
  readonly maxRecommendations: number | undefined;
}

// ---------------------------------------------------------------------------
// Simulation layer descriptor
// ---------------------------------------------------------------------------

export interface PackSimulationLayer<TEvidence, TSimulation> {
  readonly generator: PackSimulationGenerator<TEvidence, TSimulation>;
}

// ---------------------------------------------------------------------------
// Execution layer descriptor
// ---------------------------------------------------------------------------

export interface PackExecutionLayer<TPayload, TResult> {
  readonly adapter: PackExecutionAdapter<TPayload, TResult>;
  readonly rollbackAdapter: PackRollbackAdapter<TPayload> | null;
  /**
   * Checks whether execution prerequisites are satisfied.
   * Returns blockers (empty = ready).
   */
  checkReadiness(
    tenantId: string,
    executionId: string,
  ): Promise<{ ready: boolean; blockers: string[] }>;
}

// ---------------------------------------------------------------------------
// Verification layer descriptor
// ---------------------------------------------------------------------------

export interface PackVerificationLayer<TResult> {
  readonly strategy: PackVerificationStrategy<TResult>;
}

// ---------------------------------------------------------------------------
// Drift layer descriptor
// ---------------------------------------------------------------------------

export interface PackDriftLayer {
  readonly rules: readonly PackDriftDetectionRule[];
}

// ---------------------------------------------------------------------------
// Governance constraints expressed inside the pack definition
// ---------------------------------------------------------------------------

export interface PackGovernanceConstraints {
  /** Minimum RBAC roles that may trigger recommendations. */
  readonly minimumRolesForRecommendation: readonly OperatorRole[];
  /** Minimum RBAC roles that may trigger execution. */
  readonly minimumRolesForExecution: readonly OperatorRole[];
  /** Permissions that must be present on the acting identity. */
  readonly requiredPermissions: readonly Permission[];
  /** Intent types this pack is allowed to initiate. */
  readonly allowedIntentTypes: readonly ExecutionIntentType[];
}

// ---------------------------------------------------------------------------
// The canonical pack definition
// ---------------------------------------------------------------------------

/**
 * EconomicOperationsPackDefinition<TEv, TRec, TSim, TPayload, TResult>
 *
 * The single declarative artefact authored per-pack. The factory compiler
 * reads this definition and produces a CompiledEconomicOperationsPack.
 *
 * Type parameters:
 *   TEv      – the normalised evidence shape
 *   TRec     – the recommendation shape
 *   TSim     – the simulation output shape
 *   TPayload – the execution payload shape
 *   TResult  – the execution result / verification target shape
 */
export interface EconomicOperationsPackDefinition<
  TEv,
  TRec,
  TSim,
  TPayload,
  TResult,
> {
  // ------------------------------------------------------------------
  // Identity
  // ------------------------------------------------------------------

  /** Stable, globally unique pack identifier, e.g. "m365-disabled-user-license-reclaim". */
  readonly id: string;

  /** Human-readable pack name. */
  readonly name: string;

  /** Semantic version string following semver, e.g. "1.0.0". */
  readonly version: string;

  // ------------------------------------------------------------------
  // Classification
  // ------------------------------------------------------------------

  readonly domain: PackDomain;
  readonly category: PackCategory;
  readonly description: string;
  readonly riskProfile: RiskProfile;
  readonly blastRadiusClassification: BlastRadiusClassification;

  // ------------------------------------------------------------------
  // Operational constraints
  // ------------------------------------------------------------------

  /**
   * Minimum tenant operational mode before the pack may move beyond read-only
   * recommendations.
   */
  readonly minimumTenantMode: PackTenantMode;

  /** Execution modes this pack supports. At least one must be provided. */
  readonly supportedExecutionModes: readonly [PackExecutionMode, ...PackExecutionMode[]];

  /** Connector capabilities the pack requires to collect evidence. */
  readonly requiredCapabilities: readonly ConnectorCapability[];

  /** Specific connector + scope pairs required. */
  readonly requiredConnectorScopes: readonly PackConnectorScope[];

  /** Approval policy applied when approval is required. */
  readonly defaultApprovalPolicy: PackApprovalPolicy;

  // ------------------------------------------------------------------
  // Feature flags
  // ------------------------------------------------------------------

  readonly supportsRollback: boolean;
  readonly supportsVerification: boolean;
  readonly supportsDriftDetection: boolean;
  readonly supportsSimulation: boolean;

  // ------------------------------------------------------------------
  // Governance
  // ------------------------------------------------------------------

  readonly governance: PackGovernanceConstraints;

  // ------------------------------------------------------------------
  // Subsystem layers
  // ------------------------------------------------------------------

  readonly evidenceLayer: PackEvidenceLayer<unknown, TEv>;
  readonly recommendationLayer: PackRecommendationLayer<TEv, TRec>;
  readonly simulationLayer: TSim extends null ? null : PackSimulationLayer<TEv, TSim>;
  readonly executionLayer: PackExecutionLayer<TPayload, TResult>;
  readonly verificationLayer: TResult extends null ? null : PackVerificationLayer<TResult>;
  readonly driftLayer: PackDriftLayer | null;

  // ------------------------------------------------------------------
  // UX
  // ------------------------------------------------------------------

  readonly ux: PackUXMetadata;
}

// ---------------------------------------------------------------------------
// Compiled pack output — what the factory produces
// ---------------------------------------------------------------------------

/**
 * CompiledEconomicOperationsPack
 *
 * The runtime-ready object produced by compileEconomicOperationsPack().
 * Consumers interact with packs exclusively through this interface.
 */
export interface CompiledEconomicOperationsPack {
  /**
   * The stable pack ID, mirrored from the definition for registry look-ups.
   */
  readonly packId: string;

  /**
   * The original definition retained for introspection and re-compilation.
   */
  readonly definition: EconomicOperationsPackDefinition<
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >;

  /**
   * Timestamp (ISO-8601) at which the pack was compiled.
   */
  readonly compiledAt: string;

  // ------------------------------------------------------------------
  // Lifecycle handlers
  // ------------------------------------------------------------------

  /**
   * Collects evidence then runs the recommendation generator.
   * Returns typed recommendations for the given tenant.
   */
  runRecommendations(
    tenantId: string,
    context: Record<string, unknown>,
  ): Promise<unknown[]>;

  /**
   * Generates a deterministic simulation for a given evidence snapshot.
   * Returns null if the pack does not support simulation.
   */
  runSimulation(
    tenantId: string,
    executionId: string,
    evidence: unknown,
  ): Promise<unknown | null>;

  /**
   * Checks all execution readiness prerequisites.
   */
  checkReadiness(
    tenantId: string,
    executionId: string,
  ): Promise<{ ready: boolean; blockers: string[] }>;

  /**
   * Runs the pack's verification strategy against an expected result.
   * Returns verified=false and confidence=0 if the pack does not support verification.
   */
  runVerification(
    tenantId: string,
    executionId: string,
    expected: unknown,
  ): Promise<{ verified: boolean; confidence: number }>;

  /**
   * Evaluates all drift detection rules and returns per-rule results.
   * Returns an empty array if the pack does not support drift detection.
   */
  detectDrift(
    tenantId: string,
    executionId: string,
  ): Promise<Array<{ ruleId: string; severity: string; triggered: boolean }>>;

  /**
   * Returns the display-layer UX metadata for this pack.
   */
  getUXMetadata(): PackUXMetadata;
}
