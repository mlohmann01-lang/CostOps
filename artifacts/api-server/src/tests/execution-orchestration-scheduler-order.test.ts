import test from "node:test";
import assert from "node:assert/strict";
import { processExecutionOrchestrationQueueJob } from "../jobs/process-execution-orchestration-queue";

test("scheduler evaluates batches before individual items", async () => {
  const out = await processExecutionOrchestrationQueueJob({ tenantId: "default", limit: 1 });
  const batchIdx = out.phases.indexOf("batch-readiness");
  const queueIdx = out.phases.indexOf("individual-queue");
  assert.equal(batchIdx >= 0 && queueIdx >= 0 && batchIdx < queueIdx, true);
});
