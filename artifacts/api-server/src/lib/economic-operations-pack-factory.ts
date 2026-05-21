/**
 * economic-operations-pack-factory.ts
 *
 * Compiler / factory that takes an EconomicOperationsPackDefinition and
 * produces a fully wired CompiledEconomicOperationsPack.
 *
 * The compiler:
 *   1. Validates that all required fields are structurally present.
 *   2. Wires together the subsystem layers into live async handlers.
 *   3. Logs compilation steps via a lightweight console logger.
 *   4. Returns a sealed CompiledEconomicOperationsPack ready for registration.
 */

import type {
  EconomicOperationsPackDefinition,
  CompiledEconomicOperationsPack,
  PackUXMetadata,
} from './economic-operations-pack-types.js';

// ---------------------------------------------------------------------------
// Internal logger
// ---------------------------------------------------------------------------

interface PackCompilerLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function createConsoleLogger(packId: string): PackCompilerLogger {
  const prefix = `[PackFactory][${packId}]`;
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
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Asserts that a value is non-null and non-undefined, throwing a descriptive
 * error at compile time (i.e. inside compileEconomicOperationsPack).
 */
function assertPresent(value: unknown, fieldPath: string, packId: string): void {
  if (value === undefined || value === null) {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${packId}": required field "${fieldPath}" is absent or null.`,
    );
  }
}

function assertNonEmptyArray(value: unknown, fieldPath: string, packId: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${packId}": field "${fieldPath}" must be a non-empty array.`,
    );
  }
}

function assertString(value: unknown, fieldPath: string, packId: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${packId}": field "${fieldPath}" must be a non-empty string.`,
    );
  }
}

/**
 * Validates every required structural field of the pack definition.
 * Throws synchronously if validation fails — this is intentional so that
 * mis-configured packs are caught at boot time, not at request time.
 */
function validateDefinition(
  def: EconomicOperationsPackDefinition<unknown, unknown, unknown, unknown, unknown>,
): void {
  const id = typeof def.id === 'string' ? def.id : '<unknown>';

  // Identity
  assertString(def.id, 'id', id);
  assertString(def.name, 'name', id);
  assertString(def.version, 'version', id);

  // Classification
  assertString(def.domain, 'domain', id);
  assertString(def.category, 'category', id);
  assertString(def.description, 'description', id);
  assertString(def.riskProfile, 'riskProfile', id);
  assertString(def.blastRadiusClassification, 'blastRadiusClassification', id);

  // Operational constraints
  assertString(def.minimumTenantMode, 'minimumTenantMode', id);
  assertNonEmptyArray(def.supportedExecutionModes, 'supportedExecutionModes', id);
  assertPresent(def.requiredCapabilities, 'requiredCapabilities', id);
  assertPresent(def.requiredConnectorScopes, 'requiredConnectorScopes', id);
  assertString(def.defaultApprovalPolicy, 'defaultApprovalPolicy', id);

  // Feature flags
  if (typeof def.supportsRollback !== 'boolean') {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${id}": "supportsRollback" must be a boolean.`,
    );
  }
  if (typeof def.supportsVerification !== 'boolean') {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${id}": "supportsVerification" must be a boolean.`,
    );
  }
  if (typeof def.supportsDriftDetection !== 'boolean') {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${id}": "supportsDriftDetection" must be a boolean.`,
    );
  }
  if (typeof def.supportsSimulation !== 'boolean') {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${id}": "supportsSimulation" must be a boolean.`,
    );
  }

  // Governance
  assertPresent(def.governance, 'governance', id);
  assertPresent(def.governance.minimumRolesForRecommendation, 'governance.minimumRolesForRecommendation', id);
  assertPresent(def.governance.minimumRolesForExecution, 'governance.minimumRolesForExecution', id);
  assertPresent(def.governance.requiredPermissions, 'governance.requiredPermissions', id);
  assertPresent(def.governance.allowedIntentTypes, 'governance.allowedIntentTypes', id);

  // Evidence layer
  assertPresent(def.evidenceLayer, 'evidenceLayer', id);
  assertPresent(def.evidenceLayer.collector, 'evidenceLayer.collector', id);
  assertPresent(def.evidenceLayer.normalizer, 'evidenceLayer.normalizer', id);
  assertPresent(def.evidenceLayer.trustScorer, 'evidenceLayer.trustScorer', id);
  assertPresent(def.evidenceLayer.savingsEstimator, 'evidenceLayer.savingsEstimator', id);

  // Recommendation layer
  assertPresent(def.recommendationLayer, 'recommendationLayer', id);
  assertPresent(def.recommendationLayer.generator, 'recommendationLayer.generator', id);

  // Simulation layer (optional, but must be consistent with supportsSimulation)
  if (def.supportsSimulation && def.simulationLayer === null) {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${id}": "supportsSimulation" is true but "simulationLayer" is null.`,
    );
  }

  // Execution layer
  assertPresent(def.executionLayer, 'executionLayer', id);
  assertPresent(def.executionLayer.adapter, 'executionLayer.adapter', id);
  assertPresent(def.executionLayer.checkReadiness, 'executionLayer.checkReadiness', id);

  // Rollback consistency
  if (def.supportsRollback && def.executionLayer.rollbackAdapter === null) {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${id}": "supportsRollback" is true but "executionLayer.rollbackAdapter" is null.`,
    );
  }

  // Verification layer (optional, but must be consistent with supportsVerification)
  if (def.supportsVerification && def.verificationLayer === null) {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${id}": "supportsVerification" is true but "verificationLayer" is null.`,
    );
  }

  // Drift layer
  if (def.supportsDriftDetection && def.driftLayer === null) {
    throw new Error(
      `[PackFactory] Compilation failed for pack "${id}": "supportsDriftDetection" is true but "driftLayer" is null.`,
    );
  }
  if (def.supportsDriftDetection && def.driftLayer !== null) {
    assertPresent(def.driftLayer, 'driftLayer', id);
    if (!Array.isArray(def.driftLayer!.rules) || def.driftLayer!.rules.length === 0) {
      throw new Error(
        `[PackFactory] Compilation failed for pack "${id}": "driftLayer.rules" must be a non-empty array when supportsDriftDetection is true.`,
      );
    }
  }

  // UX
  assertPresent(def.ux, 'ux', id);
  assertString(def.ux.displayName, 'ux.displayName', id);
  assertString(def.ux.shortDescription, 'ux.shortDescription', id);
  assertString(def.ux.iconSlug, 'ux.iconSlug', id);
}

// ---------------------------------------------------------------------------
// Core compiler
// ---------------------------------------------------------------------------

/**
 * compileEconomicOperationsPack
 *
 * Validates the pack definition and returns a fully wired
 * CompiledEconomicOperationsPack.
 *
 * Throws synchronously on validation failure so mis-configured packs are
 * caught at application startup rather than at request time.
 */
export function compileEconomicOperationsPack<
  TEv,
  TRec,
  TSim,
  TPayload,
  TResult,
>(
  definition: EconomicOperationsPackDefinition<TEv, TRec, TSim, TPayload, TResult>,
): CompiledEconomicOperationsPack {
  const logger = createConsoleLogger(definition.id);

  logger.info('Starting pack compilation', {
    id: definition.id,
    version: definition.version,
    domain: definition.domain,
    category: definition.category,
  });

  // --- 1. Validate --------------------------------------------------------

  logger.info('Validating definition fields');

  // We cast to the widened type for generic validation logic.
  const widened = definition as EconomicOperationsPackDefinition<
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >;

  validateDefinition(widened);

  logger.info('Validation passed');

  // --- 2. Wire lifecycle handlers -----------------------------------------

  const compiledAt = new Date().toISOString();

  logger.info('Wiring lifecycle handlers', { compiledAt });

  /**
   * runRecommendations — collect evidence then generate recommendations.
   */
  async function runRecommendations(
    tenantId: string,
    context: Record<string, unknown>,
  ): Promise<unknown[]> {
    const evidence = await definition.evidenceLayer.collector.collect(tenantId, context);
    const recommendations = await definition.recommendationLayer.generator.generate(
      tenantId,
      evidence as TEv,
    );
    const max = definition.recommendationLayer.maxRecommendations;
    if (max !== undefined && recommendations.length > max) {
      return (recommendations as unknown[]).slice(0, max);
    }
    return recommendations as unknown[];
  }

  /**
   * runSimulation — delegates to the simulation layer if present.
   */
  async function runSimulation(
    tenantId: string,
    executionId: string,
    evidence: unknown,
  ): Promise<unknown | null> {
    if (!definition.supportsSimulation || definition.simulationLayer === null) {
      logger.warn('runSimulation called but pack does not support simulation', {
        tenantId,
        executionId,
      });
      return null;
    }
    // simulationLayer is non-null here; TypeScript cannot narrow through the
    // conditional type so we assert safely.
    const layer = definition.simulationLayer as {
      generator: { simulate(t: string, e: string, ev: unknown): Promise<unknown> };
    };
    return layer.generator.simulate(tenantId, executionId, evidence);
  }

  /**
   * checkReadiness — delegates to the execution layer's readiness check.
   */
  async function checkReadiness(
    tenantId: string,
    executionId: string,
  ): Promise<{ ready: boolean; blockers: string[] }> {
    return definition.executionLayer.checkReadiness(tenantId, executionId);
  }

  /**
   * runVerification — delegates to the verification layer if present.
   */
  async function runVerification(
    tenantId: string,
    executionId: string,
    expected: unknown,
  ): Promise<{ verified: boolean; confidence: number }> {
    if (!definition.supportsVerification || definition.verificationLayer === null) {
      logger.warn('runVerification called but pack does not support verification', {
        tenantId,
        executionId,
      });
      return { verified: false, confidence: 0 };
    }
    const layer = definition.verificationLayer as {
      strategy: {
        verify(
          t: string,
          e: string,
          ex: unknown,
        ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }>;
      };
    };
    const result = await layer.strategy.verify(tenantId, executionId, expected);
    return { verified: result.verified, confidence: result.confidence };
  }

  /**
   * detectDrift — evaluates all drift rules in parallel.
   */
  async function detectDrift(
    tenantId: string,
    executionId: string,
  ): Promise<Array<{ ruleId: string; severity: string; triggered: boolean }>> {
    if (!definition.supportsDriftDetection || definition.driftLayer === null) {
      return [];
    }
    const results = await Promise.all(
      definition.driftLayer.rules.map(async (rule) => {
        try {
          const outcome = await rule.evaluate(tenantId, executionId, {});
          return { ruleId: rule.ruleId, severity: rule.severity, triggered: outcome.triggered };
        } catch (err) {
          logger.error('Drift rule evaluation failed', {
            ruleId: rule.ruleId,
            tenantId,
            executionId,
            error: err instanceof Error ? err.message : String(err),
          });
          return { ruleId: rule.ruleId, severity: rule.severity, triggered: false };
        }
      }),
    );
    return results;
  }

  /**
   * getUXMetadata — returns the static UX descriptor.
   */
  function getUXMetadata(): PackUXMetadata {
    return definition.ux;
  }

  // --- 3. Assemble compiled pack ------------------------------------------

  logger.info('Pack compilation complete', {
    id: definition.id,
    compiledAt,
    supportsSimulation: definition.supportsSimulation,
    supportsVerification: definition.supportsVerification,
    supportsDriftDetection: definition.supportsDriftDetection,
    supportsRollback: definition.supportsRollback,
  });

  const compiled: CompiledEconomicOperationsPack = {
    packId: definition.id,
    definition: widened,
    compiledAt,
    runRecommendations,
    runSimulation,
    checkReadiness,
    runVerification,
    detectDrift,
    getUXMetadata,
  };

  // Seal the object in development environments to prevent accidental mutation.
  return Object.freeze(compiled);
}
