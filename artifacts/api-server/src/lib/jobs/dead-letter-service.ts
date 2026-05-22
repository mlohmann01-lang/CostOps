import { db, deadLetterJobsTable, economicOperationsJobsTable } from '@workspace/db'
import { eq, and } from 'drizzle-orm'
import { logger } from '../logger.js'

type DeadLetterEntry = {
  jobId: string
  jobType: string
  tenantId: string
  failedAt: string
  attemptCount: number
  lastError: string
  payload: Record<string, unknown>
  status: 'DEAD' | 'REPLAY_REQUESTED' | 'REPLAYED'
}

// Record a job as dead-lettered (max retries exhausted)
// Inserts into the dead_letter_jobs table. Never throws.
async function recordDeadLetter(entry: Omit<DeadLetterEntry, 'status'>): Promise<void> {
  try {
    await db.insert(deadLetterJobsTable).values({
      jobRunId: entry.jobId,
      tenantId: entry.tenantId,
      jobType: entry.jobType,
      reason: entry.lastError,
      payload: entry.payload,
      error: { message: entry.lastError, failedAt: entry.failedAt },
      retryCount: entry.attemptCount,
    })

    logger.warn(
      {
        jobId: entry.jobId,
        jobType: entry.jobType,
        tenantId: entry.tenantId,
        attemptCount: entry.attemptCount,
        lastError: entry.lastError,
      },
      'Job dead-lettered after exhausting retries',
    )
  } catch (err: unknown) {
    logger.error(
      {
        jobId: entry.jobId,
        jobType: entry.jobType,
        tenantId: entry.tenantId,
        err,
      },
      'Failed to record dead letter entry',
    )
  }
}

// Request replay of a dead-lettered job (operator action)
// Updates the economicOperationsJobs status to allow re-queuing.
async function requestReplay(
  jobId: string,
  requestedBy: string,
): Promise<{ queued: boolean; reason?: string }> {
  try {
    const numericId = parseInt(jobId, 10)
    if (isNaN(numericId)) {
      return { queued: false, reason: 'JOB_NOT_FOUND' }
    }

    const rows = await db
      .select()
      .from(economicOperationsJobsTable)
      .where(eq(economicOperationsJobsTable.id, numericId))
      .limit(1)

    if (rows.length === 0) {
      return { queued: false, reason: 'JOB_NOT_FOUND' }
    }

    await db
      .update(economicOperationsJobsTable)
      .set({
        status: 'QUEUED',
        attemptCount: 0,
        lastError: null,
        lockedBy: null,
        lockExpiresAt: null,
        failedAt: null,
        startedAt: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(economicOperationsJobsTable.id, numericId))

    logger.info(
      { jobId, requestedBy },
      'Dead-lettered job queued for replay',
    )

    return { queued: true }
  } catch (err: unknown) {
    logger.error({ jobId, requestedBy, err }, 'Failed to request job replay')
    return { queued: false, reason: 'INTERNAL_ERROR' }
  }
}

// List dead-lettered jobs for a tenant
async function listDeadLetters(tenantId: string, limit: number = 50): Promise<DeadLetterEntry[]> {
  try {
    const rows = await db
      .select()
      .from(deadLetterJobsTable)
      .where(eq(deadLetterJobsTable.tenantId, tenantId))
      .limit(limit)

    return rows.map((row) => ({
      jobId: row.jobRunId,
      jobType: row.jobType,
      tenantId: row.tenantId,
      failedAt: row.createdAt.toISOString(),
      attemptCount: row.retryCount,
      lastError: row.reason,
      payload: row.payload as Record<string, unknown>,
      status: 'DEAD' as const,
    }))
  } catch (err: unknown) {
    logger.error({ tenantId, err }, 'Failed to list dead letters')
    return []
  }
}

export type { DeadLetterEntry }
export { recordDeadLetter, requestReplay, listDeadLetters }
