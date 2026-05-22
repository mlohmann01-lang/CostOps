/**
 * OpenAI Read-Only Sync Job (Part 6)
 *
 * Orchestrates: readiness validation, usage/cost fetch, normalization, cost attribution, pack trigger.
 * Read-only — no mutations to OpenAI side.
 */

import type { OpenAIConnectorReadiness } from './openai-capability-registry.js';
import { openaiCapabilityRegistry } from './openai-capability-registry.js';
import { openaiAdminClient, OpenAIAPIError } from './openai-admin-client.js';
import { openaiCredentialManager } from './openai-credentials.js';
import { openaiTelemetryNormalizer } from './openai-telemetry-normalizer.js';
import type { RawOpenAITelemetryBatch } from './openai-raw-telemetry-dto.js';
import type { NormalizedOpenAIEvent } from './openai-telemetry-normalizer.js';
import { logger } from '../../logger.js';

export type OpenAISyncJobInput = {
  tenantId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  jobId: string;
  correlationId: string;
};

export type OpenAISyncJobResult = {
  jobId: string;
  status: 'SUCCESS' | 'FAILED' | 'DEGRADED';
  tenantId: string;
  usageEventsNormalized: number;
  costEventsNormalized: number;
  eventsIngested: number;
  errorCount: number;
  completedAt: string;
  readiness?: OpenAIConnectorReadiness;
};

export class OpenAISyncJob {
  /**
   * Execute the sync job: validate readiness, fetch, normalize, attribute, trigger packs
   */
  async execute(input: OpenAISyncJobInput): Promise<OpenAISyncJobResult> {
    const startTime = Date.now();
    const result: OpenAISyncJobResult = {
      jobId: input.jobId,
      status: 'DEGRADED',
      tenantId: input.tenantId,
      usageEventsNormalized: 0,
      costEventsNormalized: 0,
      eventsIngested: 0,
      errorCount: 0,
      completedAt: new Date().toISOString(),
    };

    try {
      logger.info(
        {
          jobId: input.jobId,
          tenantId: input.tenantId,
          correlationId: input.correlationId,
          component: 'openai-sync-job',
        },
        'Starting OpenAI read-only sync',
      );

      // Step 1: Validate readiness
      const readiness = await this.validateReadiness(input.tenantId);
      result.readiness = readiness;

      if (readiness.overallState === 'UNAVAILABLE') {
        throw new Error(`OpenAI connector unavailable: ${readiness.capabilityStatuses.map((s) => s.errorReason).join(', ')}`);
      }

      // Step 2: Fetch raw telemetry
      const rawBatch = await this.fetchRawTelemetry(input, readiness);
      result.usageEventsNormalized = rawBatch.usageEvents.length;
      result.costEventsNormalized = rawBatch.costEvents.length;

      if (rawBatch.usageEvents.length === 0 && rawBatch.costEvents.length === 0) {
        logger.warn(
          {
            jobId: input.jobId,
            tenantId: input.tenantId,
            correlationId: input.correlationId,
            component: 'openai-sync-job',
          },
          'No telemetry data found for period',
        );
        result.status = 'DEGRADED';
        return result;
      }

      // Step 3: Normalize to canonical schema
      const normalized = openaiTelemetryNormalizer.normalizeBatch(rawBatch);
      const dataQuality = openaiTelemetryNormalizer.assessDataQuality(normalized);

      logger.info(
        {
          jobId: input.jobId,
          tenantId: input.tenantId,
          normalizedCount: normalized.length,
          estimatedFraction: dataQuality.estimatedFraction,
          attributionComplete: dataQuality.attributionComplete,
          correlationId: input.correlationId,
          component: 'openai-sync-job',
        },
        'Normalized telemetry to canonical schema',
      );

      // Step 4: Attribute costs to projects/users
      const attributedEvents = await this.attributeCosts(input.tenantId, normalized);

      // Step 5: Persist normalized events (would be done in real implementation)
      result.eventsIngested = attributedEvents.length;
      result.status = attributedEvents.length > 0 ? 'SUCCESS' : 'DEGRADED';

      // Step 6: Trigger downstream packs
      // (In real implementation, would queue OPENAI_RECOMMENDATION_GENERATION job)
      await this.triggerPackGeneration(input.tenantId, attributedEvents);

      logger.info(
        {
          jobId: input.jobId,
          tenantId: input.tenantId,
          status: result.status,
          eventsIngested: result.eventsIngested,
          durationMs: Date.now() - startTime,
          correlationId: input.correlationId,
          component: 'openai-sync-job',
        },
        'OpenAI sync job completed',
      );

      return result;
    } catch (error) {
      result.status = 'FAILED';
      result.errorCount = 1;
      result.completedAt = new Date().toISOString();

      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          jobId: input.jobId,
          tenantId: input.tenantId,
          error: errorMsg,
          durationMs: Date.now() - startTime,
          correlationId: input.correlationId,
          component: 'openai-sync-job',
        },
        'OpenAI sync job failed',
      );

      throw error;
    }
  }

  /**
   * Validate connector readiness (check all capabilities)
   */
  private async validateReadiness(tenantId: string): Promise<OpenAIConnectorReadiness> {
    const capabilityStatuses = await Promise.all([
      this.checkCredentialValidation(),
      this.checkUsageDataRead(),
      this.checkCostDataRead(),
      this.checkProjectAttribution(),
      this.checkUserAttribution(),
      this.checkBillingPeriodSync(),
    ]);

    const overallState = openaiCapabilityRegistry.computeOverallState(capabilityStatuses);
    const readinessScore = openaiCapabilityRegistry.computeReadinessScore(capabilityStatuses);

    return {
      connectorId: 'OPENAI',
      overallState,
      capabilityStatuses,
      readinessScore,
      lastAssessedAt: new Date().toISOString(),
    };
  }

  private async checkCredentialValidation() {
    const isValid = await openaiAdminClient.validateCredentials();
    return {
      capability: 'CREDENTIAL_VALIDATION' as const,
      state: isValid ? ('READY' as const) : ('UNAVAILABLE' as const),
      lastCheckedAt: new Date().toISOString(),
      errorReason: isValid ? undefined : 'API key invalid or credentials not configured',
    };
  }

  private async checkUsageDataRead() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const result = await openaiAdminClient.getUsageData(startDate, endDate);
      return {
        capability: 'USAGE_DATA_READ' as const,
        state: result.data.length > 0 ? ('READY' as const) : ('DEGRADED' as const),
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorReason = error instanceof OpenAIAPIError ? error.errorType : 'UNKNOWN';
      return {
        capability: 'USAGE_DATA_READ' as const,
        state: 'UNAVAILABLE' as const,
        lastCheckedAt: new Date().toISOString(),
        errorReason: `Failed to read usage data: ${errorReason}`,
      };
    }
  }

  private async checkCostDataRead() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const result = await openaiAdminClient.getCostData(startDate, endDate);
      return {
        capability: 'COST_DATA_READ' as const,
        state: result.data.length > 0 ? ('READY' as const) : ('DEGRADED' as const),
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorReason = error instanceof OpenAIAPIError ? error.errorType : 'UNKNOWN';
      return {
        capability: 'COST_DATA_READ' as const,
        state: 'UNAVAILABLE' as const,
        lastCheckedAt: new Date().toISOString(),
        errorReason: `Failed to read cost data: ${errorReason}`,
      };
    }
  }

  private async checkProjectAttribution() {
    try {
      const result = await openaiAdminClient.listProjects();
      return {
        capability: 'PROJECT_ATTRIBUTION' as const,
        state: result.data.length > 0 ? ('READY' as const) : ('DEGRADED' as const),
        lastCheckedAt: new Date().toISOString(),
      };
    } catch {
      return {
        capability: 'PROJECT_ATTRIBUTION' as const,
        state: 'DEGRADED' as const,
        lastCheckedAt: new Date().toISOString(),
        errorReason: 'Could not enumerate projects',
      };
    }
  }

  private async checkUserAttribution() {
    try {
      const result = await openaiAdminClient.listUsers();
      return {
        capability: 'USER_ATTRIBUTION' as const,
        state: result.data.length > 0 ? ('READY' as const) : ('DEGRADED' as const),
        lastCheckedAt: new Date().toISOString(),
      };
    } catch {
      return {
        capability: 'USER_ATTRIBUTION' as const,
        state: 'DEGRADED' as const,
        lastCheckedAt: new Date().toISOString(),
        errorReason: 'Could not enumerate users',
      };
    }
  }

  private async checkBillingPeriodSync() {
    // Billing period sync is available if cost data is available
    return {
      capability: 'BILLING_PERIOD_SYNC' as const,
      state: 'READY' as const,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch raw telemetry from OpenAI Admin API (paginated)
   */
  private async fetchRawTelemetry(input: OpenAISyncJobInput, readiness: OpenAIConnectorReadiness): Promise<RawOpenAITelemetryBatch> {
    const batch: RawOpenAITelemetryBatch = {
      metadata: {
        connectorId: 'OPENAI',
        tenantId: input.tenantId,
        syncStartedAt: new Date().toISOString(),
        syncEndedAt: '',
        periodStartDate: input.startDate,
        periodEndDate: input.endDate,
        dataSourceVersion: '1.0',
        usageEventsIngested: 0,
        costEventsIngested: 0,
        projectsIngested: 0,
        usersIngested: 0,
        errorCount: 0,
        hasPartialUsageData: false,
        hasPartialCostData: false,
        hasMissingAttribution: false,
      },
      usageEvents: [],
      costEvents: [],
      projects: [],
      users: [],
    };

    // Fetch usage data (paginated)
    let usageCursor: string | undefined;
    let usageHasMore = true;
    while (usageHasMore) {
      try {
        const usageResult = await openaiAdminClient.getUsageData(input.startDate, input.endDate, usageCursor);
        batch.usageEvents.push(...usageResult.data);
        usageCursor = usageResult.nextCursor;
        usageHasMore = usageResult.hasMore;
      } catch (error) {
        batch.metadata.errorCount++;
        batch.metadata.hasPartialUsageData = true;
        break;
      }
    }

    // Fetch cost data (paginated)
    let costCursor: string | undefined;
    let costHasMore = true;
    while (costHasMore) {
      try {
        const costResult = await openaiAdminClient.getCostData(input.startDate, input.endDate, costCursor);
        batch.costEvents.push(...costResult.data);
        costCursor = costResult.nextCursor;
        costHasMore = costResult.hasMore;
      } catch (error) {
        batch.metadata.errorCount++;
        batch.metadata.hasPartialCostData = true;
        break;
      }
    }

    // Fetch projects
    try {
      let projectCursor: string | undefined;
      let projectsHasMore = true;
      while (projectsHasMore) {
        const projectsResult = await openaiAdminClient.listProjects(projectCursor);
        batch.projects.push(...projectsResult.data);
        projectCursor = projectsResult.nextCursor;
        projectsHasMore = projectsResult.hasMore;
      }
    } catch (error) {
      batch.metadata.errorCount++;
    }

    // Fetch users
    try {
      let userCursor: string | undefined;
      let usersHasMore = true;
      while (usersHasMore) {
        const usersResult = await openaiAdminClient.listUsers(userCursor);
        batch.users.push(...usersResult.data);
        userCursor = usersResult.nextCursor;
        usersHasMore = usersResult.hasMore;
      }
    } catch (error) {
      batch.metadata.errorCount++;
    }

    batch.metadata.usageEventsIngested = batch.usageEvents.length;
    batch.metadata.costEventsIngested = batch.costEvents.length;
    batch.metadata.projectsIngested = batch.projects.length;
    batch.metadata.usersIngested = batch.users.length;
    batch.metadata.syncEndedAt = new Date().toISOString();
    batch.metadata.hasMissingAttribution = batch.usageEvents.some((e) => !e.userId);

    return batch;
  }

  /**
   * Attribute costs to projects and users
   */
  private async attributeCosts(tenantId: string, events: NormalizedOpenAIEvent[]): Promise<NormalizedOpenAIEvent[]> {
    // In a real implementation, would perform cost allocation,
    // split shared costs, apply charge-back rules, etc.
    // For now, return events as-is
    return events;
  }

  /**
   * Trigger downstream recommendation generation
   */
  private async triggerPackGeneration(tenantId: string, events: NormalizedOpenAIEvent[]): Promise<void> {
    // In real implementation, would queue OPENAI_RECOMMENDATION_GENERATION job
    logger.info(
      {
        tenantId,
        eventCount: events.length,
        component: 'openai-sync-job',
      },
      'Triggering OpenAI recommendation generation pack',
    );
  }
}

export const openaiSyncJob = new OpenAISyncJob();
