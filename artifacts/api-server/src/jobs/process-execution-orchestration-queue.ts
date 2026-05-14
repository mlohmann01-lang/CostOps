import { ExecutionAutomationPromotionService, ExecutionBatchService, ExecutionOrchestrationProcessor, ExecutionQueueService, ExecutionSlaService } from "../lib/execution-orchestration";

export async function processExecutionOrchestrationQueueJob(input: { tenantId: string; workerId?: string; limit?: number }) {
  const queue = new ExecutionQueueService();
  const processor = new ExecutionOrchestrationProcessor(queue);
  const sla = new ExecutionSlaService();
  const batches = new ExecutionBatchService();
  const automation = new ExecutionAutomationPromotionService();
  const limit = Math.min(input.limit ?? 5, 10);
  await queue.releaseExpiredLocks();
  await queue.evaluateDependencies(input.tenantId);
  await sla.checkSlaBreaches(input.tenantId);
  const batchRows = await batches.listBatches(input.tenantId);
  for (const b of batchRows) await batches.evaluateBatchReadiness(input.tenantId, b.id);
  const candidateReviews = batchRows.map((b:any)=>automation.evaluatePromotion({ currentMode:"RECOMMEND_ONLY", successfulRuns: 0, verifiedSampleBatches: 0, failureRatePercent: 0, rollbackAvailable: true, riskClass: b.riskClassMax ?? "A", blastRadiusBand: b.blastRadiusBand ?? "LOW" }));
  const ready = await queue.getReadyQueueItems(input.tenantId, limit);
  let processed = 0;
  for (const item of ready) {
    await processor.processReadyItem(input.tenantId, input.workerId ?? "job:processExecutionOrchestrationQueue", item);
    processed += 1;
  }
  return { tenantId: input.tenantId, processed, scanned: ready.length, limit, candidateReviews: candidateReviews.length, phases: ["release-locks", "dependencies", "sla", "batch-readiness", "sample-batches", "eligible-batches", "automation-eval", "automation-demotion", "individual-queue", "summary"] };
}
