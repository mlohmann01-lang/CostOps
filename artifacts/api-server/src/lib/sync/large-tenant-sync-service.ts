export type SyncChunkResult = {
  chunkIndex: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  cursor: string | null;
  hasMore: boolean;
  durationMs: number;
};

export type SyncCheckpoint = {
  tenantId: string;
  connectorId: string;
  syncType: string;
  checkpointKey: string;
  cursor: string | null;
  processedCount: number;
  totalEstimate: number | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  startedAt: Date;
  updatedAt: Date;
};

export type SyncProgress = {
  tenantId: string;
  connectorId: string;
  syncType: string;
  totalEstimate: number | null;
  processedCount: number;
  percentComplete: number | null;
  status: string;
  cursor: string | null;
  canResume: boolean;
};

export type PagedUser = {
  userId: string;
  userPrincipalName: string;
  data: Record<string, unknown>;
};

export type SyncPageSource = {
  fetchPage: (cursor: string | null, pageSize: number) => Promise<{ items: PagedUser[]; nextCursor: string | null; totalEstimate?: number }>;
  processItem: (item: PagedUser, tenantId: string) => Promise<void>;
};

export type LargeTenantSyncConfig = {
  tenantId: string;
  connectorId: string;
  syncType: string;
  pageSize: number;
  maxPagesPerRun: number;
  checkpointKey?: string;
  rateLimitDelayMs?: number;
};

export class LargeTenantSyncService {
  private checkpoints = new Map<string, SyncCheckpoint>();

  getCheckpoint(tenantId: string, connectorId: string, syncType: string): SyncCheckpoint | undefined {
    return this.checkpoints.get(`${tenantId}:${connectorId}:${syncType}`);
  }

  saveCheckpoint(checkpoint: SyncCheckpoint): void {
    this.checkpoints.set(`${checkpoint.tenantId}:${checkpoint.connectorId}:${checkpoint.syncType}`, checkpoint);
  }

  async runSyncChunk(
    config: LargeTenantSyncConfig,
    source: SyncPageSource,
  ): Promise<SyncChunkResult> {
    const checkpointKey = config.checkpointKey ?? `${config.tenantId}:${config.connectorId}:${config.syncType}`;
    const existing = this.checkpoints.get(`${config.tenantId}:${config.connectorId}:${config.syncType}`);
    let cursor = existing?.cursor ?? null;
    let processedCount = existing?.processedCount ?? 0;

    const start = Date.now();
    let chunksProcessed = 0;
    let totalEstimate: number | undefined;

    const checkpoint: SyncCheckpoint = {
      tenantId: config.tenantId,
      connectorId: config.connectorId,
      syncType: config.syncType,
      checkpointKey,
      cursor,
      processedCount,
      totalEstimate: existing?.totalEstimate ?? null,
      status: 'IN_PROGRESS',
      startedAt: existing?.startedAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.saveCheckpoint(checkpoint);

    let succeeded = 0;
    let failed = 0;
    let hasMore = true;

    while (chunksProcessed < config.maxPagesPerRun && hasMore) {
      if (config.rateLimitDelayMs && chunksProcessed > 0) {
        await new Promise((r) => setTimeout(r, config.rateLimitDelayMs));
      }

      const page = await source.fetchPage(cursor, config.pageSize);
      if (page.totalEstimate != null) totalEstimate = page.totalEstimate;

      for (const item of page.items) {
        try {
          await source.processItem(item, config.tenantId);
          succeeded++;
          processedCount++;
        } catch {
          failed++;
        }
      }

      cursor = page.nextCursor;
      hasMore = cursor != null;
      chunksProcessed++;

      const updated: SyncCheckpoint = {
        ...checkpoint,
        cursor,
        processedCount,
        totalEstimate: totalEstimate ?? checkpoint.totalEstimate,
        updatedAt: new Date(),
      };
      this.saveCheckpoint(updated);
    }

    const finalStatus = !hasMore ? 'COMPLETED' : 'PAUSED';
    const final: SyncCheckpoint = { ...checkpoint, cursor, processedCount, totalEstimate: totalEstimate ?? checkpoint.totalEstimate, status: finalStatus, updatedAt: new Date() };
    this.saveCheckpoint(final);

    return {
      chunkIndex: chunksProcessed,
      processedCount: succeeded + failed,
      succeededCount: succeeded,
      failedCount: failed,
      cursor,
      hasMore,
      durationMs: Date.now() - start,
    };
  }

  getSyncProgress(tenantId: string, connectorId: string, syncType: string): SyncProgress | null {
    const checkpoint = this.checkpoints.get(`${tenantId}:${connectorId}:${syncType}`);
    if (!checkpoint) return null;

    const percentComplete = checkpoint.totalEstimate != null && checkpoint.totalEstimate > 0
      ? Math.round((checkpoint.processedCount / checkpoint.totalEstimate) * 100)
      : null;

    return {
      tenantId,
      connectorId,
      syncType,
      totalEstimate: checkpoint.totalEstimate,
      processedCount: checkpoint.processedCount,
      percentComplete,
      status: checkpoint.status,
      cursor: checkpoint.cursor,
      canResume: checkpoint.status === 'PAUSED' || checkpoint.status === 'FAILED',
    };
  }

  resetCheckpoint(tenantId: string, connectorId: string, syncType: string): void {
    this.checkpoints.delete(`${tenantId}:${connectorId}:${syncType}`);
  }
}

export const globalSyncService = new LargeTenantSyncService();
