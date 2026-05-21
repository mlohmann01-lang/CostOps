import type { JobType } from './economic-operations-job-registry';

export type MetricName =
  | 'job_count'
  | 'sync_duration_ms'
  | 'recommendations_generated'
  | 'execution_attempts'
  | 'execution_blocked'
  | 'verification_success'
  | 'verification_failure'
  | 'drift_detected'
  | 'connector_health_state'
  | 'graph_rate_limit_hit'
  | 'api_latency_ms'
  | 'error_count'
  | 'queue_backlog'
  | 'lock_contention';

export type StructuredLogEntry = {
  tenantId?: string;
  executionId?: string;
  jobId?: string;
  connectorId?: string;
  action: string;
  result: string;
  reason?: string;
  latencyMs?: number;
  actorId?: string;
  correlationId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type MetricSample = {
  name: MetricName;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
};

export class EconomicOperationsTelemetry {
  private metrics: MetricSample[] = [];
  private logs: StructuredLogEntry[] = [];

  log(entry: Omit<StructuredLogEntry, 'timestamp'>): void {
    const log = { ...entry, timestamp: new Date().toISOString() };
    this.logs.push(log);
    if (process.env.NODE_ENV !== 'test') {
      // In production, this would emit to pino/OpenTelemetry
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(log));
    }
  }

  record(name: MetricName, value: number, labels: Record<string, string> = {}): void {
    this.metrics.push({ name, value, labels, timestamp: new Date() });
  }

  recordJobCompleted(jobType: JobType, status: string, durationMs: number): void {
    this.record('job_count', 1, { jobType, status });
    if (jobType === 'M365_READ_ONLY_SYNC') {
      this.record('sync_duration_ms', durationMs, { jobType });
    }
  }

  recordExecutionAttempt(tenantId: string, result: 'ALLOWED' | 'BLOCKED'): void {
    if (result === 'ALLOWED') {
      this.record('execution_attempts', 1, { tenantId });
    } else {
      this.record('execution_blocked', 1, { tenantId });
    }
  }

  recordVerification(tenantId: string, status: 'SUCCESS' | 'FAILURE'): void {
    const name: MetricName = status === 'SUCCESS' ? 'verification_success' : 'verification_failure';
    this.record(name, 1, { tenantId });
  }

  recordDrift(tenantId: string): void {
    this.record('drift_detected', 1, { tenantId });
  }

  recordGraphRateLimit(tenantId: string): void {
    this.record('graph_rate_limit_hit', 1, { tenantId });
  }

  recordConnectorHealth(tenantId: string, connectorId: string, healthState: string): void {
    this.record('connector_health_state', 1, { tenantId, connectorId, healthState });
  }

  recordApiLatency(route: string, latencyMs: number): void {
    this.record('api_latency_ms', latencyMs, { route });
  }

  recordLockContention(tenantId: string, resourceType: string): void {
    this.record('lock_contention', 1, { tenantId, resourceType });
  }

  getMetrics(): MetricSample[] {
    return [...this.metrics];
  }

  getLogs(): StructuredLogEntry[] {
    return [...this.logs];
  }

  getMetricSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const m of this.metrics) {
      const key = `${m.name}:${JSON.stringify(m.labels)}`;
      summary[key] = (summary[key] ?? 0) + m.value;
    }
    return summary;
  }

  clearForTesting(): void {
    this.metrics = [];
    this.logs = [];
  }

  generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const operationalTelemetry = new EconomicOperationsTelemetry();
