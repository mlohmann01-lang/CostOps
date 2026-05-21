/**
 * economic-operations-pack-registry.ts
 *
 * Central in-memory registry for all compiled Economic Operations Packs.
 *
 * Packs are registered once at application startup (or module load time) and
 * subsequently looked up by ID, domain, or category.  The registry is
 * intentionally simple — it is a pure data structure with no side-effects
 * beyond logging.
 *
 * Aligns with:
 *   - CompiledEconomicOperationsPack from economic-operations-pack-types.ts
 *   - PackDomain / PackCategory from economic-operations-pack-types.ts
 */

import type {
  CompiledEconomicOperationsPack,
  PackDomain,
  PackCategory,
} from './economic-operations-pack-types.js';

// ---------------------------------------------------------------------------
// Internal logger (mirrors the style used in the factory)
// ---------------------------------------------------------------------------

interface RegistryLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function createRegistryLogger(): RegistryLogger {
  const prefix = '[PackRegistry]';
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
// Registry
// ---------------------------------------------------------------------------

/**
 * EconomicOperationsPackRegistry
 *
 * Holds all compiled packs indexed by their stable pack ID.
 * Exposes query methods for the runtime and any other consumers.
 *
 * Thread-safety note: Node.js is single-threaded so no mutex is needed.
 * If this ever moves to a worker-thread context, revisit.
 */
export class EconomicOperationsPackRegistry {
  private readonly store = new Map<string, CompiledEconomicOperationsPack>();
  private readonly logger: RegistryLogger = createRegistryLogger();

  // -------------------------------------------------------------------------
  // Mutation
  // -------------------------------------------------------------------------

  /**
   * Register a compiled pack.
   *
   * If a pack with the same ID is already registered, the registration is
   * rejected and an error is thrown.  Pack IDs must be stable and unique
   * across the entire platform; re-registration indicates a programming error.
   *
   * @throws {Error} if a pack with the same ID is already registered.
   */
  register(pack: CompiledEconomicOperationsPack): void {
    if (this.store.has(pack.packId)) {
      const msg = `[PackRegistry] Attempted to register duplicate pack ID "${pack.packId}". Each pack ID must be globally unique.`;
      this.logger.error('Duplicate pack registration rejected', { packId: pack.packId });
      throw new Error(msg);
    }

    this.store.set(pack.packId, pack);

    this.logger.info('Pack registered', {
      packId: pack.packId,
      domain: pack.definition.domain,
      category: pack.definition.category,
      version: pack.definition.version,
      compiledAt: pack.compiledAt,
      totalRegistered: this.store.size,
    });
  }

  /**
   * Replace an already-registered pack (e.g. hot-reload during development).
   *
   * Unlike `register`, this silently replaces an existing entry and logs a
   * warning so that accidental replacements in production are visible.
   */
  replace(pack: CompiledEconomicOperationsPack): void {
    const existed = this.store.has(pack.packId);
    this.store.set(pack.packId, pack);

    if (existed) {
      this.logger.warn('Pack replaced (hot-reload)', {
        packId: pack.packId,
        version: pack.definition.version,
        compiledAt: pack.compiledAt,
      });
    } else {
      this.logger.info('Pack registered via replace (new)', {
        packId: pack.packId,
        version: pack.definition.version,
      });
    }
  }

  /**
   * Remove a pack from the registry.
   *
   * Returns true if the pack was found and removed, false otherwise.
   */
  unregister(packId: string): boolean {
    const removed = this.store.delete(packId);
    if (removed) {
      this.logger.info('Pack unregistered', { packId, totalRegistered: this.store.size });
    } else {
      this.logger.warn('Attempted to unregister unknown pack', { packId });
    }
    return removed;
  }

  // -------------------------------------------------------------------------
  // Query — single
  // -------------------------------------------------------------------------

  /**
   * Retrieve a compiled pack by its stable ID.
   *
   * Returns `undefined` when no pack with that ID has been registered.
   */
  get(packId: string): CompiledEconomicOperationsPack | undefined {
    return this.store.get(packId);
  }

  /**
   * Retrieve a compiled pack by its stable ID, throwing if not found.
   *
   * Useful inside the runtime where a missing pack is a hard fault.
   *
   * @throws {Error} if the pack is not registered.
   */
  getOrThrow(packId: string): CompiledEconomicOperationsPack {
    const pack = this.store.get(packId);
    if (pack === undefined) {
      throw new Error(
        `[PackRegistry] Pack "${packId}" is not registered. Registered IDs: [${[...this.store.keys()].join(', ')}]`,
      );
    }
    return pack;
  }

  /**
   * Returns true if a pack with the given ID is registered.
   */
  has(packId: string): boolean {
    return this.store.has(packId);
  }

  // -------------------------------------------------------------------------
  // Query — collections
  // -------------------------------------------------------------------------

  /**
   * Returns all registered compiled packs as an array.
   * Order reflects registration order (Map insertion order).
   */
  list(): CompiledEconomicOperationsPack[] {
    return [...this.store.values()];
  }

  /**
   * Returns all packs belonging to the given domain.
   */
  listByDomain(domain: PackDomain): CompiledEconomicOperationsPack[] {
    return [...this.store.values()].filter(
      (pack) => pack.definition.domain === domain,
    );
  }

  /**
   * Returns all packs belonging to the given category.
   */
  listByCategory(category: PackCategory): CompiledEconomicOperationsPack[] {
    return [...this.store.values()].filter(
      (pack) => pack.definition.category === category,
    );
  }

  /**
   * Returns all packs that support simulation.
   */
  listSimulationCapable(): CompiledEconomicOperationsPack[] {
    return [...this.store.values()].filter(
      (pack) => pack.definition.supportsSimulation,
    );
  }

  /**
   * Returns all packs that support rollback.
   */
  listRollbackCapable(): CompiledEconomicOperationsPack[] {
    return [...this.store.values()].filter(
      (pack) => pack.definition.supportsRollback,
    );
  }

  /**
   * Returns all packs that support drift detection.
   */
  listDriftDetectionCapable(): CompiledEconomicOperationsPack[] {
    return [...this.store.values()].filter(
      (pack) => pack.definition.supportsDriftDetection,
    );
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  /**
   * Returns the number of registered packs.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Returns a lightweight summary of all registered packs for diagnostics
   * (e.g. health-check endpoints, admin dashboards).
   */
  summary(): Array<{
    packId: string;
    name: string;
    domain: PackDomain;
    category: PackCategory;
    version: string;
    riskProfile: string;
    blastRadius: string;
    supportsSimulation: boolean;
    supportsRollback: boolean;
    supportsDriftDetection: boolean;
    supportsVerification: boolean;
    compiledAt: string;
  }> {
    return [...this.store.values()].map((pack) => ({
      packId: pack.packId,
      name: pack.definition.name,
      domain: pack.definition.domain,
      category: pack.definition.category,
      version: pack.definition.version,
      riskProfile: pack.definition.riskProfile,
      blastRadius: pack.definition.blastRadiusClassification,
      supportsSimulation: pack.definition.supportsSimulation,
      supportsRollback: pack.definition.supportsRollback,
      supportsDriftDetection: pack.definition.supportsDriftDetection,
      supportsVerification: pack.definition.supportsVerification,
      compiledAt: pack.compiledAt,
    }));
  }
}

// ---------------------------------------------------------------------------
// Singleton global registry
// ---------------------------------------------------------------------------

/**
 * globalPackRegistry
 *
 * The process-scoped singleton registry.  All pack definitions registered at
 * boot time are placed here.  Import this wherever pack look-ups are needed.
 */
export const globalPackRegistry = new EconomicOperationsPackRegistry();
