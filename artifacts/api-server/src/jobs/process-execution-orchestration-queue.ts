import { ExecutionOrchestrationProcessor, ExecutionQueueService } from "../lib/execution-orchestration";

export async function processExecutionOrchestrationQueueJob(input: { tenantId: string; workerId?: string; limit?: number }) {
  const queue = new ExecutionQueueService();
  const processor = new ExecutionOrchestrationProcessor(queue);
  const limit = Math.min(input.limit ?? 5, 10);
  await queue.releaseExpiredLocks();
  const ready = await queue.getReadyQueueItems(input.tenantId, limit);
  let processed = 0;
  for (const item of ready) {
    await processor.processReadyItem(input.tenantId, input.workerId ?? "job:processExecutionOrchestrationQueue", item);
    processed += 1;
  }
  return { tenantId: input.tenantId, processed, scanned: ready.length, limit };
}
