import test from "node:test";
import assert from "node:assert/strict";

function createHandlers(repo: any, service: any) {
  return {
    list: async (tenantId: string) => repo.listVerifications(tenantId),
    get: async (tenantId: string, idRaw: string) => {
      const id = Number(idRaw);
      if (!Number.isInteger(id) || id < 1) return { status: 400, error: "Invalid verification id" };
      const row = await repo.getVerification(tenantId, id);
      return row ?? { status: 404, error: "Verification not found" };
    },
    markVerified: async (tenantId: string, actorId: string, id: number) => {
      const row = await service.markVerified(tenantId, id, { actualMonthlySaving: 10, actualAnnualSaving: 120 });
      await repo.appendEvent({ tenantId, actorId, eventType: "VERIFICATION_VERIFIED" });
      return row;
    },
    markFailed: async (tenantId: string, actorId: string, id: number) => {
      const row = await service.markFailed(tenantId, id, {});
      await repo.appendEvent({ tenantId, actorId, eventType: "VERIFICATION_FAILED" });
      return row;
    },
    rollbackReview: async (tenantId: string, actorId: string, id: number) => {
      const row = await service.markNeedsRollbackReview(tenantId, id, { driftDetected: true });
      await repo.appendEvent({ tenantId, actorId, eventType: "DRIFT_DETECTED" });
      return row;
    },
  };
}

test("verification routes are tenant scoped and invalid ids are controlled", async () => {
  const repo: any = {
    listVerifications: async (tenantId: string) => [{ id: 1, tenantId }],
    getVerification: async (tenantId: string, id: number) => (tenantId === "t1" && id === 1 ? { id, tenantId } : null),
  };
  const h = createHandlers(repo, {});
  assert.deepEqual(await h.list("t1"), [{ id: 1, tenantId: "t1" }]);
  assert.deepEqual(await h.get("t1", "bad"), { status: 400, error: "Invalid verification id" });
  assert.deepEqual(await h.get("t2", "1"), { status: 404, error: "Verification not found" });
});

test("mark-verified persists actual savings and emits event", async () => {
  const events: any[] = [];
  let patch: any;
  const repo: any = { appendEvent: async (e: any) => events.push(e) };
  const service: any = { markVerified: async () => (patch = { actualMonthlySaving: 10, actualAnnualSaving: 120 }) };
  const h = createHandlers(repo, service);
  await h.markVerified("t1", "actor1", 1);
  assert.equal(patch.actualAnnualSaving, 120);
  assert.ok(events.some((e) => e.eventType === "VERIFICATION_VERIFIED"));
});

test("mark-failed creates rollback review escalation and no auto rollback", async () => {
  const events: any[] = [];
  let rollbackCalled = false;
  const repo: any = { appendEvent: async (e: any) => events.push(e) };
  const service: any = {
    markFailed: async () => ({ verificationStatus: "NEEDS_ROLLBACK_REVIEW", rollbackRecommended: true }),
    markNeedsRollbackReview: async () => ({ verificationStatus: "NEEDS_ROLLBACK_REVIEW" }),
    rollbackOutcome: async () => { rollbackCalled = true; },
  };
  const h = createHandlers(repo, service);
  const failed = await h.markFailed("t1", "actor1", 1);
  await h.rollbackReview("t1", "actor1", 1);
  assert.equal(failed.rollbackRecommended, true);
  assert.equal(rollbackCalled, false);
  assert.ok(events.some((e) => e.eventType === "VERIFICATION_FAILED"));
  assert.ok(events.some((e) => e.eventType === "DRIFT_DETECTED"));
});
