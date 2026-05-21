import type { JobType } from './economic-operations-job-registry';
import type { JobRecord } from './economic-operations-job-scheduler';
import { globalJobScheduler } from './economic-operations-job-scheduler';
import { globalLockService, type LockType } from './distributed-lock-service';
import { evaluateRetry } from './economic-operations-retry-policy';
import { operationalTelemetry } from './economic-operations-telemetry';

export type JobHandler = (job: JobRecord) => Promise<Record<string, unknown>>;

export type RunnerConfig = {
  workerId: string;
  pollIntervalMs: number;
  maxConcurrentJobs: number;
  tenantId?: string;
};

export type ConcurrencyPolicy = {
  tenantMaxConcurrentJobs: number;
  providerMaxConcurrentJobs: number;
  actionClassMaxConcurrentJobs: number;
  highRiskActionLimit: number;
};

const DEFAULT_CONCURRENCY: ConcurrencyPolicy = {
  tenantMaxConcurrentJobs: 10,
  providerMaxConcurrentJobs: 5,
  actionClassMaxConcurrentJobs: 3,
  highRiskActionLimit: 1,
};

export class EconomicOperationsJobRunner {
  private handlers = new Map<JobType, JobHandler>();
  private running = new Set<string>();
  private stopped = false;
  private concurrencyPolicy: ConcurrencyPolicy;

  constructor(private config: RunnerConfig, concurrencyPolicy?: ConcurrencyPolicy) {
    this.concurrencyPolicy = concurrencyPolicy ?? DEFAULT_CONCURRENCY;
  }

  registerHandler(jobType: JobType, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  async runJob(job: JobRecord): Promise<void> {
    const handler = this.handlers.get(job.jobType);
    if (!handler) {
      globalJobScheduler.markFailed(job.id, `NO_HANDLER_FOR_${job.jobType}`);
      return;
    }

    if (this.running.size >= this.concurrencyPolicy.tenantMaxConcurrentJobs) {
      return;
    }

    const acquired = globalJobScheduler.markRunning(job.id, this.config.workerId);
    if (!acquired) return;

    this.running.add(job.id);
    const startMs = Date.now();

    try {
      const result = await handler(job);
      globalJobScheduler.markSucceeded(job.id, result);
      operationalTelemetry.recordJobCompleted(job.jobType, 'SUCCEEDED', Date.now() - startMs);
    } catch (err: unknown) {
      const errorLike = err instanceof Error
        ? { message: err.message, code: (err as NodeJS.ErrnoException).code }
        : { message: String(err) };
      const decision = evaluateRetry(errorLike, job.attemptCount);
      operationalTelemetry.recordJobCompleted(job.jobType, decision.deadLetter ? 'FAILED' : 'RETRY_SCHEDULED', Date.now() - startMs);
      globalJobScheduler.markFailed(job.id, errorLike.message ?? 'UNKNOWN_ERROR');
    } finally {
      this.running.delete(job.id);
    }
  }

  async runWithLock(job: JobRecord, lockTtlMs: number = 60000): Promise<void> {
    const lockType: LockType = 'EXECUTION';
    const lockKey = { tenantId: job.tenantId, resourceType: 'job', resourceId: job.jobKey, lockType };

    const lockResult = await globalLockService.acquireLock(lockKey, this.config.workerId, lockTtlMs);
    if (!lockResult.acquired) {
      globalJobScheduler.markFailed(job.id, `LOCK_UNAVAILABLE: ${(lockResult as { reason: string }).reason}`);
      return;
    }

    try {
      await this.runJob(job);
    } finally {
      await globalLockService.releaseLock(lockResult.lockId, this.config.workerId);
    }
  }

  async poll(): Promise<void> {
    globalJobScheduler.expireStaleJobs();
    const queued = globalJobScheduler.getQueuedJobs(this.config.tenantId);
    const available = queued.slice(0, this.concurrencyPolicy.tenantMaxConcurrentJobs - this.running.size);
    await Promise.allSettled(available.map((job) => this.runJob(job)));
  }

  stop(): void {
    this.stopped = true;
  }

  isRunning(jobId: string): boolean {
    return this.running.has(jobId);
  }

  getRunningCount(): number {
    return this.running.size;
  }
}

export function createJobRunner(config: RunnerConfig, policy?: ConcurrencyPolicy): EconomicOperationsJobRunner {
  return new EconomicOperationsJobRunner(config, policy);
}
