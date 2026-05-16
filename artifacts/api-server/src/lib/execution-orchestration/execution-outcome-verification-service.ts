import { executionOutcomeVerificationsTable } from "@workspace/db";
import { ExecutionOrchestrationRepository } from "./execution-orchestration.repository";

const STUBBED_METHODS = new Set(["CONNECTOR_RECHECK", "BILLING_RECONCILIATION", "USAGE_RECHECK"]);

export class ExecutionOutcomeVerificationService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository()) {}

  async createVerificationTask(input: any) {
    if (!input?.outcomeLedgerId) return null;
    const existing = await this.repo.getVerificationByOutcomeLedgerId(input.tenantId, String(input.outcomeLedgerId));
    if (existing) return existing;
    const expectedMonthlySaving = Number(input.expectedMonthlySaving ?? 0);
    const [created] = await this.repo.db.insert(executionOutcomeVerificationsTable).values({
      tenantId: input.tenantId, outcomeLedgerId: String(input.outcomeLedgerId), planId: input.planId, queueItemId: input.queueItemId, batchId: input.batchId ?? null,
      actionType: input.actionType, targetEntityId: input.targetEntityId, expectedOutcome: input.expectedOutcome ?? "EXECUTION_SUCCESS", expectedMonthlySaving,
      expectedAnnualSaving: Number(input.expectedAnnualSaving ?? expectedMonthlySaving * 12), verificationStatus: "PENDING", verificationMethod: input.verificationMethod ?? "LEDGER_ONLY", verificationEvidence: input.verificationEvidence ?? {}, correlationId: input.correlationId,
    }).returning();
    return created;
  }

  async evaluateVerificationTask(tenantId: string, verificationId: number) {
    const row = await this.repo.getVerification(tenantId, verificationId);
    if (!row) return null;
    if (STUBBED_METHODS.has(row.verificationMethod)) return this.repo.updateVerification(tenantId, verificationId, { verificationEvidence: { ...(row.verificationEvidence ?? {}), stubbedMethod: true } });
    if (row.verificationMethod === "MANUAL_ATTESTATION") return row;
    const outcome = await this.repo.getOutcomeLedgerById(tenantId, row.outcomeLedgerId);
    const driftDetected = Boolean(outcome?.executionStatus && outcome.executionStatus !== "EXECUTED");
    if (driftDetected) return this.markNeedsRollbackReview(tenantId, verificationId, { reason: "DRIFT_DETECTED", driftDetected: true });
    return row;
  }

  markVerified(tenantId: string, id: number, input: any) { return this.repo.updateVerification(tenantId, id, { verificationStatus: "VERIFIED", actualOutcome: input.actualOutcome ?? "VERIFIED", actualMonthlySaving: Number(input.actualMonthlySaving ?? 0), actualAnnualSaving: Number(input.actualAnnualSaving ?? Number(input.actualMonthlySaving ?? 0) * 12), verificationEvidence: input.verificationEvidence ?? {}, verifiedAt: new Date() }); }
  markDisputed(tenantId: string, id: number, input: any) { return this.repo.updateVerification(tenantId, id, { verificationStatus: "DISPUTED", actualOutcome: input.actualOutcome ?? "DISPUTED", verificationEvidence: input.verificationEvidence ?? {} }); }
  async markFailed(tenantId: string, id: number, input: any) { const out = await this.repo.updateVerification(tenantId, id, { verificationStatus: "FAILED", actualOutcome: input.actualOutcome ?? "FAILED", verificationEvidence: input.verificationEvidence ?? {} }); return this.markNeedsRollbackReview(tenantId, id, { reason: "VERIFICATION_FAILED", failure: out?.actualOutcome }); }
  async markNeedsRollbackReview(tenantId: string, id: number, input: any) {
    const row: any = await this.repo.updateVerification(tenantId, id, { verificationStatus: "NEEDS_ROLLBACK_REVIEW", rollbackRecommended: true, driftDetected: Boolean(input?.driftDetected) });
    if (!row) return null;
    await this.repo.createEscalation({ tenantId, planId: row.planId, queueItemId: row.queueItemId, escalationType: "ROLLBACK_RECOMMENDED", severity: "HIGH", status: "OPEN", reason: input?.reason ?? "Verification requires rollback review", assignedRole: "OPERATOR", correlationId: row.correlationId });
    return row;
  }
  listPendingVerifications(tenantId: string) { return this.repo.listVerificationsByStatus(tenantId, "PENDING"); }
}
