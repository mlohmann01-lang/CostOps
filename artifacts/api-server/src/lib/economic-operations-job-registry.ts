export type JobType =
  | 'M365_READ_ONLY_SYNC'
  | 'M365_RECOMMENDATION_GENERATION'
  | 'M365_EXECUTION_VERIFICATION'
  | 'M365_DRIFT_SCAN'
  | 'M365_CONNECTOR_HEALTH_CHECK'
  | 'M365_READINESS_RECHECK'
  | 'OUTCOME_LEDGER_RECONCILIATION'
  | 'OPERATOR_NOTIFICATION_DISPATCH'
  | 'SERVICENOW_SYNC'
  | 'FLEXERA_SYNC';

export type JobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RETRY_SCHEDULED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'LOCKED';

export type JobPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type JobDefinition = {
  jobType: JobType;
  defaultMaxAttempts: number;
  defaultPriority: JobPriority;
  defaultTtlMs: number;
  allowedConcurrency: number;
  isHighRisk: boolean;
  requiresLock: boolean;
  description: string;
};

export const JOB_REGISTRY: Record<JobType, JobDefinition> = {
  M365_READ_ONLY_SYNC: {
    jobType: 'M365_READ_ONLY_SYNC',
    defaultMaxAttempts: 3,
    defaultPriority: 5,
    defaultTtlMs: 15 * 60 * 1000,
    allowedConcurrency: 1,
    isHighRisk: false,
    requiresLock: true,
    description: 'Read-only sync of M365 user and license data via Graph',
  },
  M365_RECOMMENDATION_GENERATION: {
    jobType: 'M365_RECOMMENDATION_GENERATION',
    defaultMaxAttempts: 2,
    defaultPriority: 4,
    defaultTtlMs: 10 * 60 * 1000,
    allowedConcurrency: 1,
    isHighRisk: false,
    requiresLock: true,
    description: 'Generate economic recommendations from normalized M365 evidence',
  },
  M365_EXECUTION_VERIFICATION: {
    jobType: 'M365_EXECUTION_VERIFICATION',
    defaultMaxAttempts: 5,
    defaultPriority: 3,
    defaultTtlMs: 5 * 60 * 1000,
    allowedConcurrency: 10,
    isHighRisk: false,
    requiresLock: true,
    description: 'Verify outcome of a license execution via Graph re-read',
  },
  M365_DRIFT_SCAN: {
    jobType: 'M365_DRIFT_SCAN',
    defaultMaxAttempts: 3,
    defaultPriority: 6,
    defaultTtlMs: 10 * 60 * 1000,
    allowedConcurrency: 5,
    isHighRisk: false,
    requiresLock: false,
    description: 'Detect drift on verified executions',
  },
  M365_CONNECTOR_HEALTH_CHECK: {
    jobType: 'M365_CONNECTOR_HEALTH_CHECK',
    defaultMaxAttempts: 2,
    defaultPriority: 2,
    defaultTtlMs: 2 * 60 * 1000,
    allowedConcurrency: 1,
    isHighRisk: false,
    requiresLock: false,
    description: 'Check M365 Graph connector health and update health model',
  },
  M365_READINESS_RECHECK: {
    jobType: 'M365_READINESS_RECHECK',
    defaultMaxAttempts: 3,
    defaultPriority: 4,
    defaultTtlMs: 5 * 60 * 1000,
    allowedConcurrency: 5,
    isHighRisk: false,
    requiresLock: false,
    description: 'Re-evaluate readiness gates after connector or evidence changes',
  },
  OUTCOME_LEDGER_RECONCILIATION: {
    jobType: 'OUTCOME_LEDGER_RECONCILIATION',
    defaultMaxAttempts: 3,
    defaultPriority: 7,
    defaultTtlMs: 30 * 60 * 1000,
    allowedConcurrency: 1,
    isHighRisk: false,
    requiresLock: true,
    description: 'Reconcile outcome ledger against live Graph evidence',
  },
  OPERATOR_NOTIFICATION_DISPATCH: {
    jobType: 'OPERATOR_NOTIFICATION_DISPATCH',
    defaultMaxAttempts: 3,
    defaultPriority: 3,
    defaultTtlMs: 2 * 60 * 1000,
    allowedConcurrency: 10,
    isHighRisk: false,
    requiresLock: false,
    description: 'Dispatch operator alerts and event notifications',
  },
  SERVICENOW_SYNC: {
    jobType: 'SERVICENOW_SYNC',
    defaultMaxAttempts: 3,
    defaultPriority: 6,
    defaultTtlMs: 10 * 60 * 1000,
    allowedConcurrency: 1,
    isHighRisk: false,
    requiresLock: true,
    description: 'Sync ServiceNow change request status and CMDB data',
  },
  FLEXERA_SYNC: {
    jobType: 'FLEXERA_SYNC',
    defaultMaxAttempts: 3,
    defaultPriority: 6,
    defaultTtlMs: 10 * 60 * 1000,
    allowedConcurrency: 1,
    isHighRisk: false,
    requiresLock: true,
    description: 'Sync Flexera entitlement and license position data',
  },
};

export function getJobDefinition(jobType: JobType): JobDefinition {
  return JOB_REGISTRY[jobType];
}

export function isHighRiskJob(jobType: JobType): boolean {
  return JOB_REGISTRY[jobType]?.isHighRisk ?? false;
}

export function getAllJobTypes(): JobType[] {
  return Object.keys(JOB_REGISTRY) as JobType[];
}
