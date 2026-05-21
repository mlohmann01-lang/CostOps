export type LockType =
  | 'EXECUTION'
  | 'VERIFICATION'
  | 'ROLLBACK'
  | 'SYNC'
  | 'DRIFT_SCAN'
  | 'RECOMMENDATION_GENERATION';

export type LockKey = {
  tenantId: string;
  resourceType: string;
  resourceId: string;
  lockType: LockType;
};

export type LockRecord = {
  lockId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  lockType: LockType;
  lockedBy: string;
  lockExpiresAt: Date;
  acquiredAt: Date;
};

export type LockResult =
  | { acquired: true; lockId: string; expiresAt: Date }
  | { acquired: false; reason: string; lockedBy?: string; expiresAt?: Date };

function makeLockKey(key: LockKey): string {
  return `${key.tenantId}:${key.resourceType}:${key.resourceId}:${key.lockType}`;
}

export class DistributedLockService {
  private locks = new Map<string, LockRecord>();

  buildLockKey(tenantId: string, resourceType: string, resourceId: string): string {
    return `${tenantId}:${resourceType}:${resourceId}`;
  }

  async acquireLock(
    key: LockKey,
    holderId: string,
    ttlMs: number = 30000,
  ): Promise<LockResult> {
    this.expireStale();
    const k = makeLockKey(key);
    const existing = this.locks.get(k);
    if (existing) {
      return { acquired: false, reason: 'LOCK_HELD', lockedBy: existing.lockedBy, expiresAt: existing.lockExpiresAt };
    }
    const lockId = `lock-${key.tenantId}-${key.lockType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + ttlMs);
    this.locks.set(k, { lockId, tenantId: key.tenantId, resourceType: key.resourceType, resourceId: key.resourceId, lockType: key.lockType, lockedBy: holderId, lockExpiresAt: expiresAt, acquiredAt: new Date() });
    return { acquired: true, lockId, expiresAt };
  }

  async renewLock(lockId: string, ttlMs: number = 30000): Promise<boolean> {
    for (const [k, rec] of this.locks) {
      if (rec.lockId === lockId) {
        const updated = { ...rec, lockExpiresAt: new Date(Date.now() + ttlMs) };
        this.locks.set(k, updated);
        return true;
      }
    }
    return false;
  }

  async releaseLock(lockId: string, holderId: string): Promise<boolean> {
    for (const [k, rec] of this.locks) {
      if (rec.lockId === lockId && rec.lockedBy === holderId) {
        this.locks.delete(k);
        return true;
      }
    }
    return false;
  }

  async isLocked(key: LockKey): Promise<boolean> {
    this.expireStale();
    return this.locks.has(makeLockKey(key));
  }

  private expireStale(): void {
    const now = Date.now();
    for (const [k, rec] of this.locks) {
      if (rec.lockExpiresAt.getTime() < now) {
        this.locks.delete(k);
      }
    }
  }

  async withLock<T>(
    key: LockKey,
    holderId: string,
    ttlMs: number,
    fn: (lockId: string) => Promise<T>,
  ): Promise<T> {
    const result = await this.acquireLock(key, holderId, ttlMs);
    if (!result.acquired) {
      throw new Error(`LOCK_UNAVAILABLE: ${makeLockKey(key)} held by ${(result as { lockedBy?: string }).lockedBy}`);
    }
    try {
      return await fn(result.lockId);
    } finally {
      await this.releaseLock(result.lockId, holderId);
    }
  }

  static buildM365ExecutionKey(tenantId: string, userId: string, action: string): LockKey {
    return { tenantId, resourceType: 'm365:user', resourceId: `${userId}:${action}`, lockType: 'EXECUTION' };
  }

  static buildVerificationKey(tenantId: string, executionId: string): LockKey {
    return { tenantId, resourceType: 'm365:execution', resourceId: `${executionId}:verification`, lockType: 'VERIFICATION' };
  }

  static buildSyncKey(tenantId: string): LockKey {
    return { tenantId, resourceType: 'm365', resourceId: 'sync', lockType: 'SYNC' };
  }

  static buildRecommendationKey(tenantId: string): LockKey {
    return { tenantId, resourceType: 'm365', resourceId: 'recommendation-generation', lockType: 'RECOMMENDATION_GENERATION' };
  }
}

export const globalLockService = new DistributedLockService();
