import { db, distributedLocksTable } from '@workspace/db'
import { eq, and, lt } from 'drizzle-orm'
import { logger } from '../logger.js'

// Schema columns (from distributedLocks.ts):
//   id, tenantId, resourceType, resourceId, lockType, lockedBy, lockExpiresAt, createdAt, metadataJson

type LockResult =
  | { acquired: true; lockId: string; expiresAt: Date }
  | { acquired: false; reason: string }

class LockNotAcquiredError extends Error {
  constructor(resourceType: string, resourceId: string) {
    super(`Lock not acquired for ${resourceType}/${resourceId}`)
    this.name = 'LockNotAcquiredError'
  }
}

// Acquire a distributed lock for a job
// 1. Delete expired locks for this resource first
// 2. Try to INSERT a new lock row
// 3. If INSERT succeeds → return { acquired: true, lockId, expiresAt }
// 4. If INSERT fails (duplicate key) → return { acquired: false, reason: 'LOCK_HELD' }
// Never throws — catches errors and returns { acquired: false, reason: 'LOCK_ERROR' }
async function acquireLock(
  resourceType: string,
  resourceId: string,
  tenantId: string,
  ttlMs: number,
  holderId: string,
): Promise<LockResult> {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlMs)

    // Step 1: Delete expired locks for this resource
    await db
      .delete(distributedLocksTable)
      .where(
        and(
          eq(distributedLocksTable.tenantId, tenantId),
          eq(distributedLocksTable.resourceType, resourceType),
          eq(distributedLocksTable.resourceId, resourceId),
          lt(distributedLocksTable.lockExpiresAt, now),
        ),
      )

    // Step 2: Check if a live lock already exists
    const existing = await db
      .select({ id: distributedLocksTable.id })
      .from(distributedLocksTable)
      .where(
        and(
          eq(distributedLocksTable.tenantId, tenantId),
          eq(distributedLocksTable.resourceType, resourceType),
          eq(distributedLocksTable.resourceId, resourceId),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      return { acquired: false, reason: 'LOCK_HELD' }
    }

    // Step 3: INSERT a new lock row
    const inserted = await db
      .insert(distributedLocksTable)
      .values({
        tenantId,
        resourceType,
        resourceId,
        lockType: 'EXECUTION',
        lockedBy: holderId,
        lockExpiresAt: expiresAt,
        metadataJson: {},
      })
      .returning({ id: distributedLocksTable.id })

    if (inserted.length === 0) {
      return { acquired: false, reason: 'LOCK_HELD' }
    }

    const lockId = String(inserted[0]!.id)

    logger.debug(
      { lockId, resourceType, resourceId, tenantId, holderId, expiresAt },
      'Distributed lock acquired',
    )

    return { acquired: true, lockId, expiresAt }
  } catch (err: unknown) {
    // Postgres unique violation or other insert conflict
    const errMsg = err instanceof Error ? err.message : String(err)
    const isConflict =
      errMsg.includes('duplicate key') ||
      errMsg.includes('unique constraint') ||
      errMsg.includes('23505')

    if (isConflict) {
      return { acquired: false, reason: 'LOCK_HELD' }
    }

    logger.error({ resourceType, resourceId, tenantId, holderId, err }, 'Lock acquisition error')
    return { acquired: false, reason: 'LOCK_ERROR' }
  }
}

// Release a lock
// DELETE the lock row WHERE id = lockId AND lockedBy = holderId
// Returns true if deleted, false if not found
async function releaseLock(lockId: string, holderId: string): Promise<boolean> {
  try {
    const numericId = parseInt(lockId, 10)
    if (isNaN(numericId)) {
      return false
    }

    const deleted = await db
      .delete(distributedLocksTable)
      .where(
        and(
          eq(distributedLocksTable.id, numericId),
          eq(distributedLocksTable.lockedBy, holderId),
        ),
      )
      .returning({ id: distributedLocksTable.id })

    const released = deleted.length > 0

    if (released) {
      logger.debug({ lockId, holderId }, 'Distributed lock released')
    }

    return released
  } catch (err: unknown) {
    logger.error({ lockId, holderId, err }, 'Lock release error')
    return false
  }
}

// Wrapper: run a function with a distributed lock
// If lock cannot be acquired, throw LockNotAcquiredError
async function withLock<T>(
  resourceType: string,
  resourceId: string,
  tenantId: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const holderId = `process-${process.pid}-${Date.now()}`
  const lockResult = await acquireLock(resourceType, resourceId, tenantId, ttlMs, holderId)

  if (!lockResult.acquired) {
    throw new LockNotAcquiredError(resourceType, resourceId)
  }

  const { lockId } = lockResult

  try {
    return await fn()
  } finally {
    await releaseLock(lockId, holderId)
  }
}

export { acquireLock, releaseLock, withLock, LockNotAcquiredError }
export type { LockResult }
