/**
 * OpenAI Connector Capability Registry (Part 1)
 *
 * Defines the 6 capabilities of the OpenAI connector and their readiness states.
 * Each capability has a discovery function that checks prerequisites (credentials, API access, data availability).
 */

export const OPENAI_CAPABILITIES = [
  'CREDENTIAL_VALIDATION',
  'USAGE_DATA_READ',
  'COST_DATA_READ',
  'PROJECT_ATTRIBUTION',
  'USER_ATTRIBUTION',
  'BILLING_PERIOD_SYNC',
] as const;

export type OpenAICapability = (typeof OPENAI_CAPABILITIES)[number];

export type CapabilityReadinessState = 'READY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

export type CapabilityStatus = {
  capability: OpenAICapability;
  state: CapabilityReadinessState;
  lastCheckedAt: string;
  errorReason?: string;
  metadata?: Record<string, unknown>;
};

export type OpenAIConnectorReadiness = {
  connectorId: 'OPENAI';
  overallState: CapabilityReadinessState;
  capabilityStatuses: CapabilityStatus[];
  readinessScore: number; // 0–1, fraction of READY capabilities
  lastAssessedAt: string;
};

export class OpenAICapabilityRegistry {
  private capabilities: Set<OpenAICapability> = new Set(OPENAI_CAPABILITIES);

  /**
   * List all supported capabilities
   */
  listCapabilities(): OpenAICapability[] {
    return Array.from(this.capabilities);
  }

  /**
   * Check if a capability is supported
   */
  supportsCapability(cap: OpenAICapability): boolean {
    return this.capabilities.has(cap);
  }

  /**
   * Get the capability display name for UI/docs
   */
  getCapabilityDisplayName(cap: OpenAICapability): string {
    const names: Record<OpenAICapability, string> = {
      CREDENTIAL_VALIDATION: 'API Credential Validation',
      USAGE_DATA_READ: 'Usage Data Read',
      COST_DATA_READ: 'Cost Data Read',
      PROJECT_ATTRIBUTION: 'Project Attribution',
      USER_ATTRIBUTION: 'User Attribution',
      BILLING_PERIOD_SYNC: 'Billing Period Sync',
    };
    return names[cap];
  }

  /**
   * Describe what each capability does
   */
  getCapabilityDescription(cap: OpenAICapability): string {
    const descriptions: Record<OpenAICapability, string> = {
      CREDENTIAL_VALIDATION:
        'Validates OpenAI API key and access to Admin APIs. Required before any data sync.',
      USAGE_DATA_READ: 'Reads token usage data (input/output tokens) for all projects and models.',
      COST_DATA_READ: 'Reads billing cost data in USD from OpenAI billing export.',
      PROJECT_ATTRIBUTION:
        'Attributes usage and costs to OpenAI projects. Enables per-project cost allocation.',
      USER_ATTRIBUTION:
        'Attributes usage to OpenAI user IDs. Enables user-level cost tracking and per-seat governance.',
      BILLING_PERIOD_SYNC:
        'Syncs billing period boundaries and cost aggregations. Aligns with OpenAI billing cycles.',
    };
    return descriptions[cap];
  }

  /**
   * Compute overall readiness from individual capability states
   */
  computeOverallState(statuses: CapabilityStatus[]): CapabilityReadinessState {
    const states = statuses.map((s) => s.state);

    // All READY → READY
    if (states.every((s) => s === 'READY')) {
      return 'READY';
    }

    // Any UNAVAILABLE and critical caps → UNAVAILABLE
    const criticalUnavailable = statuses
      .filter((s) => s.state === 'UNAVAILABLE')
      .some((s) =>
        ['CREDENTIAL_VALIDATION', 'USAGE_DATA_READ', 'COST_DATA_READ'].includes(s.capability),
      );
    if (criticalUnavailable) {
      return 'UNAVAILABLE';
    }

    // Some DEGRADED → DEGRADED
    if (states.some((s) => s === 'DEGRADED')) {
      return 'DEGRADED';
    }

    return 'UNKNOWN';
  }

  /**
   * Compute readiness score (0–1 fraction of READY capabilities)
   */
  computeReadinessScore(statuses: CapabilityStatus[]): number {
    const readyCount = statuses.filter((s) => s.state === 'READY').length;
    return statuses.length > 0 ? readyCount / statuses.length : 0;
  }
}

export const openaiCapabilityRegistry = new OpenAICapabilityRegistry();
