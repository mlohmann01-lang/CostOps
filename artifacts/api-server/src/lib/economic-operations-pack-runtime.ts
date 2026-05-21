/**
 * economic-operations-pack-runtime.ts
 *
 * Runtime bridge that connects compiled packs to the operational spine.
 *
 * The runtime mediates every lifecycle stage a pack can go through:
 *   1. Recommendation generation
 *   2. Execution readiness evaluation
 *   3. Simulation
 *   4. Verification
 *   5. Drift detection
 *
 * It also provides UX-metadata and domain/category listing for renderers.
 *
 * Aligns with:
 *   - CompiledEconomicOperationsPack / PackUXMetadata from economic-operations-pack-types.ts
 *   - EconomicOperationsPackRegistry from economic-operations-pack-registry.ts
 *   - ExecutionIntentType / OperationalState from economic-operations-intent-service.ts
 *   - Permission / OperatorRole from economic-operations-rbac.ts
 */

import type { PackUXMetadata, PackDomain } from './economic-operations-pack-types.js';
import type { CompiledEconomicOperationsPack } from './economic-operations-pack-types.js';
import {
  EconomicOperationsPackRegistry,
  globalPackRegistry,
} from './economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Result shapes exposed by the runtime
// ---------------------------------------------------------------------------

/**
 * A single recommendation surface by a pack for a tenant.
 *
 * The inner `recommendation` field holds the pack-specific typed value.
 * Callers that need the concrete shape must narrow via the pack definition.
 */
export interface PackRecommendationResult {
  /** Pack that produced this recommendation. */
  readonly packId: string;
  /** Tenant the recommendation was generated for. */
  readonly tenantId: string;
  /** ISO-8601 timestamp of when the recommendation was generated. */
  readonly generatedAt: string;
  /** The pack-specific recommendation payload. */
  readonly recommendation: unknown;
  /** Index within the batch returned by this pack (0-based). */
  readonly index: number;
}

/**
 * Context object passed into lifecycle calls.
 * Carries tenant-level metadata and caller-supplied key/value pairs.
 */
export interface PackExecutionContext {
  /** Stable tenant identifier. */
  readonly tenantId: string;
  /** Identifier of the specific execution record being acted upon. */
  readonly executionId: string;
  /** Arbitrary caller-supplied key/value metadata. */
  readonly metadata: Record<string, unknown>;
}

/**
 * Result of a pack verification run.
 */
export interface PackVerificationResult {
  /** Pack that performed the verification. */
  readonly packId: string;
  readonly tenantId: string;
  readonly executionId: string;
  /** Whether the execution outcome matched the expected result. */
  readonly verified: boolean;
  /** Confidence score in [0, 1]. */
  readonly confidence: number;
  /** ISO-8601 timestamp of when verification was performed. */
  readonly verifiedAt: string;
}

/**
 * Result of evaluating a single drift detection rule.
 */
export interface PackDriftResult {
  /** Pack that owns this drift result. */
  readonly packId: string;
  readonly tenantId: string;
  readonly executionId: string;
  /** Stable rule identifier from PackDriftDetectionRule. */
  readonly ruleId: string;
  /** Severity level declared on the rule. */
  readonly severity: string;
  /** Whether the rule fired (detected drift). */
  readonly triggered: boolean;
  /** ISO-8601 timestamp of the evaluation. */
  readonly evaluatedAt: string;
}

// ---------------------------------------------------------------------------
// Internal logger
// ---------------------------------------------------------------------------

interface RuntimeLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function createRuntimeLogger(): RuntimeLogger {
  const prefix = '[PackRuntime]';
  return {
    info(message, meta) {
      console.info(`${prefix} INFO  ${message}`, meta ?? '');
    },
    warn(message, meta) {
      console.warn(`${prefix} WARN  ${message}`, meta ?? '');
    },
    error(message, meta) {
      console.error(`${prefix} ERROR ${message}`, meta ?? '');
    },
  };
}

// ---------------------------------------------------------------------------
// Runtime error class
// ---------------------------------------------------------------------------

/**
 * Thrown when the runtime encounters a pack-level fault that cannot be
 * recovered from within the runtime itself (e.g. pack not found,
 * unexpected adapter failure).
 */
export class PackRuntimeError extends Error {
  constructor(
    public readonly packId: string,
    public readonly stage: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[PackRuntime][${packId}][${stage}] ${message}`);
    this.name = 'PackRuntimeError';
  }
}

// ---------------------------------------------------------------------------
// Runtime executor
// ---------------------------------------------------------------------------

/**
 * EconomicOperationsPackRuntime
 *
 * The central execution bridge.  All pack lifecycle invocations pass through
 * this class, which:
 *   - Resolves packs from the registry.
 *   - Delegates to the appropriate compiled-pack handler.
 *   - Wraps results in structured runtime types.
 *   - Logs every operation with tenant/pack/execution correlation keys.
 *   - Surfaces errors as PackRuntimeError rather than raw adapter errors.
 */
export class EconomicOperationsPackRuntime {
  private readonly logger: RuntimeLogger = createRuntimeLogger();

  constructor(private readonly registry: EconomicOperationsPackRegistry) {}

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Resolve a pack from the registry, throwing PackRuntimeError if absent.
   */
  private resolvePack(packId: string, stage: string): CompiledEconomicOperationsPack {
    const pack = this.registry.get(packId);
    if (pack === undefined) {
      throw new PackRuntimeError(
        packId,
        stage,
        `Pack "${packId}" is not registered in the runtime registry.`,
      );
    }
    return pack;
  }

  // -------------------------------------------------------------------------
  // 1. Recommendation generation
  // -------------------------------------------------------------------------

  /**
   * Execute the recommendation lifecycle stage for a pack.
   *
   * Collects evidence for the tenant via the pack's evidence layer, runs the
   * recommendation generator, and returns a structured result array.
   *
   * @param packId     - Stable pack identifier.
   * @param tenantId   - Tenant to generate recommendations for.
   * @param context    - Caller-supplied context forwarded to the evidence collector.
   *
   * @throws PackRuntimeError on adapter failure.
   */
  async generateRecommendations(
    packId: string,
    tenantId: string,
    context: Record<string, unknown>,
  ): Promise<PackRecommendationResult[]> {
    const pack = this.resolvePack(packId, 'generateRecommendations');

    this.logger.info('Generating recommendations', { packId, tenantId });

    let rawRecommendations: unknown[];
    try {
      rawRecommendations = await pack.runRecommendations(tenantId, context);
    } catch (err) {
      this.logger.error('Recommendation generation failed', {
        packId,
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new PackRuntimeError(
        packId,
        'generateRecommendations',
        `Evidence collection or recommendation generation failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    const generatedAt = new Date().toISOString();
    const results: PackRecommendationResult[] = rawRecommendations.map(
      (recommendation, index) => ({
        packId,
        tenantId,
        generatedAt,
        recommendation,
        index,
      }),
    );

    this.logger.info('Recommendations generated', {
      packId,
      tenantId,
      count: results.length,
    });

    return results;
  }

  // -------------------------------------------------------------------------
  // 2. Execution readiness evaluation
  // -------------------------------------------------------------------------

  /**
   * Check whether all execution prerequisites are satisfied for the given
   * tenant/execution pair.
   *
   * @param packId      - Stable pack identifier.
   * @param tenantId    - Tenant context.
   * @param executionId - Execution record identifier.
   *
   * @throws PackRuntimeError on adapter failure.
   */
  async evaluateReadiness(
    packId: string,
    tenantId: string,
    executionId: string,
  ): Promise<{ ready: boolean; blockers: string[] }> {
    const pack = this.resolvePack(packId, 'evaluateReadiness');

    this.logger.info('Evaluating execution readiness', { packId, tenantId, executionId });

    let result: { ready: boolean; blockers: string[] };
    try {
      result = await pack.checkReadiness(tenantId, executionId);
    } catch (err) {
      this.logger.error('Readiness check failed', {
        packId,
        tenantId,
        executionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new PackRuntimeError(
        packId,
        'evaluateReadiness',
        `Readiness check adapter threw an unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    this.logger.info('Readiness evaluation complete', {
      packId,
      tenantId,
      executionId,
      ready: result.ready,
      blockerCount: result.blockers.length,
    });

    return result;
  }

  // -------------------------------------------------------------------------
  // 3. Simulation
  // -------------------------------------------------------------------------

  /**
   * Run a deterministic simulation of the execution outcome.
   *
   * Returns `null` when the pack does not support simulation.
   *
   * @param packId      - Stable pack identifier.
   * @param tenantId    - Tenant context.
   * @param executionId - Execution record identifier.
   * @param evidence    - Evidence snapshot to simulate against.
   *
   * @throws PackRuntimeError on adapter failure.
   */
  async runSimulation(
    packId: string,
    tenantId: string,
    executionId: string,
    evidence: unknown,
  ): Promise<unknown> {
    const pack = this.resolvePack(packId, 'runSimulation');

    if (!pack.definition.supportsSimulation) {
      this.logger.warn('Simulation requested but pack does not support it', {
        packId,
        tenantId,
        executionId,
      });
      return null;
    }

    this.logger.info('Running simulation', { packId, tenantId, executionId });

    let simulationOutput: unknown;
    try {
      simulationOutput = await pack.runSimulation(tenantId, executionId, evidence);
    } catch (err) {
      this.logger.error('Simulation failed', {
        packId,
        tenantId,
        executionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new PackRuntimeError(
        packId,
        'runSimulation',
        `Simulation adapter threw an unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    this.logger.info('Simulation complete', { packId, tenantId, executionId });

    return simulationOutput;
  }

  // -------------------------------------------------------------------------
  // 4. Verification
  // -------------------------------------------------------------------------

  /**
   * Verify that an execution produced the expected outcome.
   *
   * Returns `verified: false, confidence: 0` when the pack does not support
   * verification, and the caller can distinguish this from a genuine
   * verification failure via the `packSupportsVerification` flag on the result.
   *
   * @param packId      - Stable pack identifier.
   * @param tenantId    - Tenant context.
   * @param executionId - Execution record identifier.
   * @param expected    - Expected result shape to verify against.
   *
   * @throws PackRuntimeError on adapter failure.
   */
  async runVerification(
    packId: string,
    tenantId: string,
    executionId: string,
    expected: unknown,
  ): Promise<PackVerificationResult> {
    const pack = this.resolvePack(packId, 'runVerification');

    if (!pack.definition.supportsVerification) {
      this.logger.warn('Verification requested but pack does not support it', {
        packId,
        tenantId,
        executionId,
      });
      return {
        packId,
        tenantId,
        executionId,
        verified: false,
        confidence: 0,
        verifiedAt: new Date().toISOString(),
      };
    }

    this.logger.info('Running verification', { packId, tenantId, executionId });

    let raw: { verified: boolean; confidence: number };
    try {
      raw = await pack.runVerification(tenantId, executionId, expected);
    } catch (err) {
      this.logger.error('Verification failed', {
        packId,
        tenantId,
        executionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new PackRuntimeError(
        packId,
        'runVerification',
        `Verification adapter threw an unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    const result: PackVerificationResult = {
      packId,
      tenantId,
      executionId,
      verified: raw.verified,
      confidence: raw.confidence,
      verifiedAt: new Date().toISOString(),
    };

    this.logger.info('Verification complete', {
      packId,
      tenantId,
      executionId,
      verified: result.verified,
      confidence: result.confidence,
    });

    return result;
  }

  // -------------------------------------------------------------------------
  // 5. Drift detection
  // -------------------------------------------------------------------------

  /**
   * Evaluate all drift detection rules registered on the pack.
   *
   * Returns an empty array when the pack does not support drift detection.
   *
   * @param packId      - Stable pack identifier.
   * @param tenantId    - Tenant context.
   * @param executionId - Execution record identifier.
   *
   * @throws PackRuntimeError on adapter failure.
   */
  async detectDrift(
    packId: string,
    tenantId: string,
    executionId: string,
  ): Promise<PackDriftResult[]> {
    const pack = this.resolvePack(packId, 'detectDrift');

    if (!pack.definition.supportsDriftDetection) {
      this.logger.warn('Drift detection requested but pack does not support it', {
        packId,
        tenantId,
        executionId,
      });
      return [];
    }

    this.logger.info('Running drift detection', { packId, tenantId, executionId });

    let rawResults: Array<{ ruleId: string; severity: string; triggered: boolean }>;
    try {
      rawResults = await pack.detectDrift(tenantId, executionId);
    } catch (err) {
      this.logger.error('Drift detection failed', {
        packId,
        tenantId,
        executionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new PackRuntimeError(
        packId,
        'detectDrift',
        `Drift detection adapter threw an unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    const evaluatedAt = new Date().toISOString();
    const results: PackDriftResult[] = rawResults.map((r) => ({
      packId,
      tenantId,
      executionId,
      ruleId: r.ruleId,
      severity: r.severity,
      triggered: r.triggered,
      evaluatedAt,
    }));

    const triggeredCount = results.filter((r) => r.triggered).length;
    this.logger.info('Drift detection complete', {
      packId,
      tenantId,
      executionId,
      totalRules: results.length,
      triggeredCount,
    });

    return results;
  }

  // -------------------------------------------------------------------------
  // UX metadata
  // -------------------------------------------------------------------------

  /**
   * Returns the display-layer UX metadata for a pack, or `undefined` if the
   * pack is not registered.
   *
   * This is a synchronous read — no adapter call is made.
   */
  getPackUXMetadata(packId: string): PackUXMetadata | undefined {
    const pack = this.registry.get(packId);
    if (pack === undefined) {
      this.logger.warn('getPackUXMetadata called for unknown pack', { packId });
      return undefined;
    }
    return pack.getUXMetadata();
  }

  // -------------------------------------------------------------------------
  // Listing helpers
  // -------------------------------------------------------------------------

  /**
   * Returns all compiled packs registered for the given domain string.
   *
   * The `domain` parameter is typed as `string` rather than `PackDomain` so
   * that callers coming from un-typed layers (e.g. HTTP query params) can call
   * this without a cast.  Non-matching values simply return an empty array.
   */
  listPacksForDomain(domain: string): CompiledEconomicOperationsPack[] {
    return this.registry.list().filter(
      (pack) => pack.definition.domain === (domain as PackDomain),
    );
  }

  /**
   * Returns all compiled packs registered in the underlying registry.
   */
  listAllPacks(): CompiledEconomicOperationsPack[] {
    return this.registry.list();
  }

  /**
   * Returns a lightweight status summary for every registered pack,
   * suitable for inclusion in a health-check or monitoring response.
   */
  healthSummary(): Array<{
    packId: string;
    name: string;
    domain: string;
    category: string;
    version: string;
    compiledAt: string;
    capabilities: {
      simulation: boolean;
      rollback: boolean;
      verification: boolean;
      driftDetection: boolean;
    };
  }> {
    return this.registry.list().map((pack) => ({
      packId: pack.packId,
      name: pack.definition.name,
      domain: pack.definition.domain,
      category: pack.definition.category,
      version: pack.definition.version,
      compiledAt: pack.compiledAt,
      capabilities: {
        simulation: pack.definition.supportsSimulation,
        rollback: pack.definition.supportsRollback,
        verification: pack.definition.supportsVerification,
        driftDetection: pack.definition.supportsDriftDetection,
      },
    }));
  }
}

// ---------------------------------------------------------------------------
// Singleton global runtime
// ---------------------------------------------------------------------------

/**
 * globalPackRuntime
 *
 * The process-scoped singleton runtime backed by the global registry.
 * Import this wherever pack lifecycle operations need to be invoked.
 */
export const globalPackRuntime = new EconomicOperationsPackRuntime(globalPackRegistry);
