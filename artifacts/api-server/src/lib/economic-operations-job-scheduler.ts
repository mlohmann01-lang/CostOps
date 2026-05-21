import type { JobType, JobStatus } from './economic-operations-job-registry';
import { JOB_REGISTRY } from './economic-operations-job-registry';

export type JobRecord = {
  id: string;
  tenantId: string;
  jobType: JobType;
  jobKey: string;
  status: JobStatus;
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  lastError?: string;
  lockedBy?: string;
  lockExpiresAt?: Date;
  idempotencyKey: string;
  payloadJson: Record<string, unknown>;
  resultJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type EnqueueJobInput = {
  tenantId: string;
  jobType: JobType;
  jobKey: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  scheduledAt?: Date;
  priority?: number;
};

export type JobQueryFilter = {
  tenantId?: string;
  jobType?: JobType;
  status?: JobStatus;
  jobKey?: string;
};

export class EconomicOperationsJobScheduler {
  private jobs = new Map<string, JobRecord>();
  private idCounter = 0;

  enqueue(input: EnqueueJobInput): { jobId: string; deduplicated: boolean } {
    const def = JOB_REGISTRY[input.jobType];
    const idempotencyKey = input.idempotencyKey ?? `${input.tenantId}:${input.jobKey}:${input.jobType}`;

    const existing = this.findByIdempotencyKey(idempotencyKey);
    if (existing && ['QUEUED', 'RUNNING', 'RETRY_SCHEDULED'].includes(existing.status)) {
      return { jobId: existing.id, deduplicated: true };
    }

    const existingByKey = this.findByJobKey(input.tenantId, input.jobKey, input.jobType);
    if (existingByKey && ['QUEUED', 'RUNNING', 'RETRY_SCHEDULED'].includes(existingByKey.status)) {
      return { jobId: existingByKey.id, deduplicated: true };
    }

    const id = `job-${++this.idCounter}-${Date.now()}`;
    const now = new Date();
    const job: JobRecord = {
      id,
      tenantId: input.tenantId,
      jobType: input.jobType,
      jobKey: input.jobKey,
      status: 'QUEUED',
      priority: input.priority ?? def.defaultPriority,
      attemptCount: 0,
      maxAttempts: def.defaultMaxAttempts,
      scheduledAt: input.scheduledAt ?? now,
      idempotencyKey,
      payloadJson: input.payload,
      resultJson: {},
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(id, job);
    return { jobId: id, deduplicated: false };
  }

  getJob(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId);
  }

  queryJobs(filter: JobQueryFilter): JobRecord[] {
    const results: JobRecord[] = [];
    for (const job of this.jobs.values()) {
      if (filter.tenantId != null && job.tenantId !== filter.tenantId) continue;
      if (filter.jobType != null && job.jobType !== filter.jobType) continue;
      if (filter.status != null && job.status !== filter.status) continue;
      if (filter.jobKey != null && job.jobKey !== filter.jobKey) continue;
      results.push(job);
    }
    return results.sort((a, b) => a.priority - b.priority || a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  markRunning(jobId: string, workerId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== 'QUEUED' && job.status !== 'RETRY_SCHEDULED')) return false;
    const now = new Date();
    this.jobs.set(jobId, { ...job, status: 'RUNNING', startedAt: now, lockedBy: workerId, lockExpiresAt: new Date(now.getTime() + 30000), attemptCount: job.attemptCount + 1, updatedAt: now });
    return true;
  }

  markSucceeded(jobId: string, result: Record<string, unknown>): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    const now = new Date();
    this.jobs.set(jobId, { ...job, status: 'SUCCEEDED', completedAt: now, resultJson: result, lockedBy: undefined, lockExpiresAt: undefined, updatedAt: now });
    return true;
  }

  markFailed(jobId: string, error: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    const now = new Date();
    if (job.attemptCount < job.maxAttempts) {
      const delay = Math.min(1000 * Math.pow(2, job.attemptCount), 60000);
      this.jobs.set(jobId, { ...job, status: 'RETRY_SCHEDULED', lastError: error, scheduledAt: new Date(now.getTime() + delay), lockedBy: undefined, lockExpiresAt: undefined, updatedAt: now });
    } else {
      this.jobs.set(jobId, { ...job, status: 'FAILED', failedAt: now, lastError: error, lockedBy: undefined, lockExpiresAt: undefined, updatedAt: now });
    }
    return true;
  }

  markCancelled(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(job.status)) return false;
    this.jobs.set(jobId, { ...job, status: 'CANCELLED', updatedAt: new Date() });
    return true;
  }

  expireStaleJobs(): number {
    const now = Date.now();
    let count = 0;
    for (const [id, job] of this.jobs) {
      if (job.status === 'RUNNING' && job.lockExpiresAt && job.lockExpiresAt.getTime() < now) {
        this.jobs.set(id, { ...job, status: 'QUEUED', lockedBy: undefined, lockExpiresAt: undefined, updatedAt: new Date() });
        count++;
      }
    }
    return count;
  }

  getQueuedJobs(tenantId?: string): JobRecord[] {
    const now = new Date();
    return this.queryJobs({ tenantId, status: 'QUEUED' }).filter((j) => j.scheduledAt <= now);
  }

  private findByIdempotencyKey(key: string): JobRecord | undefined {
    for (const job of this.jobs.values()) {
      if (job.idempotencyKey === key) return job;
    }
    return undefined;
  }

  private findByJobKey(tenantId: string, jobKey: string, jobType: JobType): JobRecord | undefined {
    for (const job of this.jobs.values()) {
      if (job.tenantId === tenantId && job.jobKey === jobKey && job.jobType === jobType) return job;
    }
    return undefined;
  }
}

export const globalJobScheduler = new EconomicOperationsJobScheduler();
