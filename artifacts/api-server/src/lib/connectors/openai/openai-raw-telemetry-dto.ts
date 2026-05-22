/**
 * Raw OpenAI Telemetry DTOs (Part 4)
 *
 * Data transfer objects representing raw OpenAI API responses.
 * These are not normalized yet — direct from Admin API.
 */

/**
 * Raw usage data from OpenAI Admin API
 * May contain partial data if certain fields are not available
 */
export type RawOpenAIUsageEvent = {
  // Identifiers
  projectId: string;
  modelId: string;

  // Token counts
  inputTokens: number;
  outputTokens: number;

  // Temporal
  usageDate: string; // YYYY-MM-DD

  // Optional attributes (may be partial)
  userId?: string;
  workflowId?: string;
  agentId?: string;
  requestId?: string;
};

/**
 * Raw cost data from OpenAI billing export
 */
export type RawOpenAICostEvent = {
  // Identifiers
  projectId: string;
  modelId: string;

  // Cost in USD
  costUSD: number;

  // Temporal
  costDate: string; // YYYY-MM-DD

  // Optional breakdown
  inputCostUSD?: number;
  outputCostUSD?: number;

  // Optional attributes
  userId?: string;
};

/**
 * Raw project information
 */
export type RawOpenAIProject = {
  projectId: string;
  projectName: string;
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
};

/**
 * Raw user information
 */
export type RawOpenAIUser = {
  userId: string;
  userName: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

/**
 * Ingestion result metadata
 */
export type OpenAITelemetryIngestionMetadata = {
  connectorId: 'OPENAI';
  tenantId: string;
  syncStartedAt: string;
  syncEndedAt: string;
  periodStartDate: string;
  periodEndDate: string;
  dataSourceVersion: string; // OpenAI API version

  // Counts
  usageEventsIngested: number;
  costEventsIngested: number;
  projectsIngested: number;
  usersIngested: number;
  errorCount: number;

  // Pagination state (for resumption)
  usageCursor?: string;
  costCursor?: string;
  projectsCursor?: string;
  usersCursor?: string;

  // Data quality flags
  hasPartialUsageData: boolean;
  hasPartialCostData: boolean;
  hasMissingAttribution: boolean;
};

/**
 * Container for raw telemetry from a single sync run
 */
export type RawOpenAITelemetryBatch = {
  metadata: OpenAITelemetryIngestionMetadata;
  usageEvents: RawOpenAIUsageEvent[];
  costEvents: RawOpenAICostEvent[];
  projects: RawOpenAIProject[];
  users: RawOpenAIUser[];
};
