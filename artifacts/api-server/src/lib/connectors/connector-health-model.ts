export type ConnectorHealthState =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'RATE_LIMITED'
  | 'AUTH_FAILED'
  | 'MISSING_SCOPES'
  | 'STALE'
  | 'PARTIAL'
  | 'UNAVAILABLE'
  | 'DISABLED';

export type ConnectorHealthRecord = {
  tenantId: string;
  connectorId: string;
  provider: string;
  healthState: ConnectorHealthState;
  lastSuccessfulSyncAt: Date | null;
  lastFailedSyncAt: Date | null;
  failureCount: number;
  rateLimitUntil: Date | null;
  missingScopes: string[];
  stalenessReason: string | null;
  capabilityAvailability: Record<string, boolean>;
  trustScore: number;
  updatedAt: Date;
};

export type ConnectorHealthInput = {
  tenantId: string;
  connectorId: string;
  provider: string;
  lastSyncResult?: 'SUCCESS' | 'FAILURE' | 'RATE_LIMITED' | 'AUTH_FAILED' | 'SCOPE_MISSING' | 'TIMEOUT';
  missingScopes?: string[];
  rateLimitUntilMs?: number;
  failureError?: { status?: number; code?: string };
  stalenessAgeDays?: number;
  capabilities?: Record<string, boolean>;
};

export type ConnectorHealthImpact = {
  blocksExecution: boolean;
  blocksSync: boolean;
  lowersTrustScore: boolean;
  requiresOperatorAlert: boolean;
  readinessBlockers: string[];
};

const STALE_THRESHOLD_DAYS = 7;

export function evaluateConnectorHealth(input: ConnectorHealthInput): ConnectorHealthRecord {
  const now = new Date();
  let healthState: ConnectorHealthState = 'HEALTHY';
  let failureCount = 0;
  let rateLimitUntil: Date | null = null;
  let stalenessReason: string | null = null;
  let trustScore = 1.0;

  if (input.lastSyncResult === 'AUTH_FAILED') {
    healthState = 'AUTH_FAILED';
    trustScore = 0.0;
    failureCount = 1;
  } else if (input.lastSyncResult === 'SCOPE_MISSING') {
    healthState = 'MISSING_SCOPES';
    trustScore = 0.1;
    failureCount = 1;
  } else if (input.lastSyncResult === 'RATE_LIMITED') {
    healthState = 'RATE_LIMITED';
    trustScore = 0.5;
    if (input.rateLimitUntilMs) rateLimitUntil = new Date(now.getTime() + input.rateLimitUntilMs);
  } else if (input.lastSyncResult === 'FAILURE' || input.lastSyncResult === 'TIMEOUT') {
    healthState = 'DEGRADED';
    trustScore = 0.3;
    failureCount = 1;
  } else if (input.stalenessAgeDays != null && input.stalenessAgeDays > STALE_THRESHOLD_DAYS) {
    healthState = 'STALE';
    stalenessReason = `Last sync ${input.stalenessAgeDays} days ago`;
    trustScore = Math.max(0, 1 - (input.stalenessAgeDays / 90));
  }

  const capabilities = input.capabilities ?? {};
  const partialCapabilities = Object.values(capabilities).some((v) => !v) && Object.values(capabilities).some((v) => v);
  if (partialCapabilities && healthState === 'HEALTHY') {
    healthState = 'PARTIAL';
    trustScore = 0.7;
  }

  return {
    tenantId: input.tenantId,
    connectorId: input.connectorId,
    provider: input.provider,
    healthState,
    lastSuccessfulSyncAt: input.lastSyncResult === 'SUCCESS' ? now : null,
    lastFailedSyncAt: input.lastSyncResult === 'FAILURE' || input.lastSyncResult === 'AUTH_FAILED' ? now : null,
    failureCount,
    rateLimitUntil,
    missingScopes: input.missingScopes ?? [],
    stalenessReason,
    capabilityAvailability: capabilities,
    trustScore,
    updatedAt: now,
  };
}

export function getConnectorHealthImpact(health: ConnectorHealthRecord): ConnectorHealthImpact {
  const blockers: string[] = [];
  let blocksExecution = false;
  let blocksSync = false;
  let lowersTrustScore = false;
  let requiresOperatorAlert = false;

  switch (health.healthState) {
    case 'AUTH_FAILED':
      blocksExecution = true;
      blocksSync = true;
      requiresOperatorAlert = true;
      blockers.push('CONNECTOR_AUTH_FAILED');
      break;
    case 'MISSING_SCOPES':
      blocksExecution = true;
      requiresOperatorAlert = true;
      blockers.push(`MISSING_SCOPES: ${health.missingScopes.join(',')}`);
      break;
    case 'UNAVAILABLE':
    case 'DISABLED':
      blocksExecution = true;
      blocksSync = true;
      requiresOperatorAlert = true;
      blockers.push(`CONNECTOR_${health.healthState}`);
      break;
    case 'DEGRADED':
      blocksExecution = true;
      lowersTrustScore = true;
      requiresOperatorAlert = true;
      blockers.push('CONNECTOR_DEGRADED');
      break;
    case 'RATE_LIMITED':
      blocksSync = true;
      lowersTrustScore = true;
      blockers.push('CONNECTOR_RATE_LIMITED');
      break;
    case 'STALE':
      lowersTrustScore = true;
      blockers.push(`CONNECTOR_STALE: ${health.stalenessReason}`);
      break;
    case 'PARTIAL':
      lowersTrustScore = true;
      break;
    default:
      break;
  }

  return { blocksExecution, blocksSync, lowersTrustScore, requiresOperatorAlert, readinessBlockers: blockers };
}

export function isConnectorSafeForExecution(health: ConnectorHealthRecord): boolean {
  return !getConnectorHealthImpact(health).blocksExecution;
}
