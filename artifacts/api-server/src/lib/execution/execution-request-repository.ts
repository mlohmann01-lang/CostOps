import { and, eq } from "drizzle-orm";
import { db, executionRequestsTable } from "@workspace/db";
import type { ExecutionRequestObject, ExecutionRequestV1 } from "./types";

function allowMemory() {
  const env = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();
  return env === "development" || env === "test";
}

export class ExecutionRequestRepository {
  private static mem = new Map<string, any>();
  private key(tenantId: string, executionRequestId: string) { return `${tenantId}:${executionRequestId}`; }
  private byRecommendation(tenantId: string, recommendationId: string) { return Array.from(ExecutionRequestRepository.mem.values()).find((r: any) => r.tenantId === tenantId && r.recommendationId === recommendationId) ?? null; }

  async upsert(req: ExecutionRequestObject) {
    try {
      const [existing] = await db.select().from(executionRequestsTable).where(and(eq(executionRequestsTable.tenantId, req.tenantId), eq(executionRequestsTable.idempotencyKey, req.idempotencyKey))).limit(1);
      if (existing) return existing;
      const [row] = await db.insert(executionRequestsTable).values({ ...req, requestedAt: new Date(req.requestedAt), approvedAt: req.approvedAt ? new Date(req.approvedAt) : null, expiresAt: new Date(req.expiresAt) }).returning();
      return row;
    } catch (e) {
      if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`);
      const found = Array.from(ExecutionRequestRepository.mem.values()).find((r: any) => r.tenantId === req.tenantId && r.idempotencyKey === req.idempotencyKey);
      if (found) return found;
      const row = { ...req, id: Date.now(), createdAt: new Date(), updatedAt: new Date() };
      ExecutionRequestRepository.mem.set(this.key(req.tenantId, req.executionRequestId), row);
      return row;
    }
  }

  async list(tenantId: string) {
    try { return await db.select().from(executionRequestsTable).where(eq(executionRequestsTable.tenantId, tenantId)); }
    catch (e) { if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); return Array.from(ExecutionRequestRepository.mem.values()).filter((r: any) => r.tenantId === tenantId); }
  }

  async getByExecutionRequestId(tenantId: string, executionRequestId: string) {
    try { const rows = await db.select().from(executionRequestsTable).where(and(eq(executionRequestsTable.tenantId, tenantId), eq(executionRequestsTable.executionRequestId, executionRequestId))).limit(1); return rows[0] ?? null; }
    catch (e) { if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); return ExecutionRequestRepository.mem.get(this.key(tenantId, executionRequestId)) ?? null; }
  }


  private toV1(row: any): ExecutionRequestV1 {
    return {
      requestId: String(row.requestId ?? row.executionRequestId),
      tenantId: String(row.tenantId),
      recommendationId: String(row.recommendationId),
      approvalWorkflowId: String(row.approvalWorkflowId ?? row.createdByWorkflowId ?? ''),
      actionType: String(row.actionType),
      playbookId: String(row.playbookId),
      platform: String(row.platform ?? 'unknown'),
      riskClass: String(row.riskClass ?? row.actionRiskClass ?? 'B') as ExecutionRequestV1['riskClass'],
      readinessState: String(row.readinessState ?? (row.executionState === 'BLOCKED' ? 'EXECUTION_BLOCKED' : 'PENDING_DRY_RUN')) as ExecutionRequestV1['readinessState'],
      executionMode: String(row.executionMode ?? 'SUPERVISED') as ExecutionRequestV1['executionMode'],
      rollbackCoverage: String(row.rollbackCoverage ?? (row.rollbackRequired ? 'FULL' : 'NONE')) as ExecutionRequestV1['rollbackCoverage'],
      projectedMonthlySavings: row.projectedMonthlySavings === undefined ? undefined : Number(row.projectedMonthlySavings),
      projectedAnnualSavings: row.projectedAnnualSavings === undefined ? undefined : Number(row.projectedAnnualSavings),
      createdAt: new Date(row.createdAt ?? row.requestedAt ?? Date.now()).toISOString(),
      createdByWorkflowId: String(row.createdByWorkflowId ?? row.approvalWorkflowId ?? ''),
      governanceStatus: String(row.governanceStatus ?? (row.executionState === 'BLOCKED' ? 'BLOCKED' : 'VALID')) as ExecutionRequestV1['governanceStatus'],
      policyEvaluationId: row.policyEvaluationId ?? undefined,
      latestDryRunState: row.latestDryRunState ?? row.metadata?.latestDryRunState,
      latestDryRunId: row.latestDryRunId ?? row.metadata?.latestDryRunId,
      rollbackSupported: row.rollbackSupported ?? row.metadata?.rollbackSupported,
      policyBlocksSummary: row.policyBlocksSummary ?? row.metadata?.policyBlocksSummary,
      latestExecutionResultId: row.latestExecutionResultId ?? row.metadata?.latestExecutionResultId,
      latestExecutionResultState: row.latestExecutionResultState ?? row.metadata?.latestExecutionResultState,
      latestOutcomeId: row.latestOutcomeId ?? row.metadata?.latestOutcomeId,
      latestOutcomeState: row.latestOutcomeState ?? row.metadata?.latestOutcomeState,
      verifiedMonthlySavings: row.verifiedMonthlySavings ?? row.metadata?.verifiedMonthlySavings,
      savingsVariance: row.savingsVariance ?? row.metadata?.savingsVariance,
      metadata: row.metadata ?? {},
    };
  }

  async createExecutionRequest(req: ExecutionRequestV1) {
    const existing = await this.getByRecommendationId(req.tenantId, req.recommendationId);
    if (existing) return existing;
    const rowLike: any = {
      executionRequestId: req.requestId,
      tenantId: req.tenantId,
      recommendationId: req.recommendationId,
      playbookId: req.playbookId,
      targetEntityId: String(req.metadata?.targetEntityId ?? req.recommendationId),
      actionType: req.actionType,
      actionRiskClass: req.riskClass,
      approvalWorkflowId: req.approvalWorkflowId,
      platform: req.platform,
      readinessState: req.readinessState,
      rollbackCoverage: req.rollbackCoverage,
      projectedMonthlySavings: req.projectedMonthlySavings === undefined ? undefined : String(req.projectedMonthlySavings),
      projectedAnnualSavings: req.projectedAnnualSavings === undefined ? undefined : String(req.projectedAnnualSavings),
      createdByWorkflowId: req.createdByWorkflowId,
      governanceStatus: req.governanceStatus,
      policyEvaluationId: req.policyEvaluationId,
      metadata: req.metadata ?? {},
      executionState: req.readinessState === 'EXECUTION_BLOCKED' || req.readinessState === 'DRY_RUN_BLOCKED' ? 'BLOCKED' : 'REQUESTED',
      executionMode: req.executionMode,
      dryRunRequired: ['PENDING_DRY_RUN','READY_FOR_DRY_RUN','DRY_RUN_BLOCKED'].includes(req.readinessState),
      rollbackRequired: req.rollbackCoverage !== 'NONE',
      rollbackPlan: { coverage: req.rollbackCoverage },
      preflightChecks: ['APPROVAL_WORKFLOW_APPROVED', 'EVIDENCE_PRESENT', 'DRY_RUN_PENDING'],
      blockedReasons: req.governanceStatus === 'BLOCKED' ? ['GOVERNANCE_BLOCKED'] : [],
      evidencePointers: Array.isArray(req.metadata?.evidencePointers) ? req.metadata.evidencePointers : [],
      governanceEventIds: [],
      idempotencyKey: `approval:${req.tenantId}:${req.recommendationId}`,
      requestedBy: String(req.metadata?.requestedBy ?? 'approval-workflow'),
      requestedAt: req.createdAt,
      approvedBy: String(req.metadata?.approvedBy ?? 'approval-workflow'),
      approvedAt: req.createdAt,
      expiresAt: new Date(new Date(req.createdAt).getTime() + 24 * 3600000).toISOString(),
    };
    try {
      const [inserted] = await db.insert(executionRequestsTable).values({ ...rowLike, requestedAt: new Date(rowLike.requestedAt), approvedAt: new Date(rowLike.approvedAt), expiresAt: new Date(rowLike.expiresAt) }).returning();
      return this.toV1(inserted);
    } catch (e) {
      if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`);
      const duplicate = this.byRecommendation(req.tenantId, req.recommendationId);
      if (duplicate) return this.toV1(duplicate);
      const row = { ...rowLike, id: Date.now(), createdAt: new Date(req.createdAt), updatedAt: new Date() };
      ExecutionRequestRepository.mem.set(this.key(req.tenantId, req.requestId), row);
      return this.toV1(row);
    }
  }

  async getByRecommendationId(tenantId: string, recommendationId: string) {
    try {
      const rows = await db.select().from(executionRequestsTable).where(and(eq(executionRequestsTable.tenantId, tenantId), eq(executionRequestsTable.recommendationId, recommendationId))).limit(1);
      return rows[0] ? this.toV1(rows[0]) : null;
    } catch (e) {
      if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`);
      const row = this.byRecommendation(tenantId, recommendationId);
      return row ? this.toV1(row) : null;
    }
  }

  async getExecutionRequest(tenantId: string, requestId: string) {
    const row = await this.getByExecutionRequestId(tenantId, requestId);
    return row ? this.toV1(row) : null;
  }

  async listExecutionRequestsByTenant(tenantId: string) {
    const rows = await this.list(tenantId);
    return rows.map((row: any) => this.toV1(row));
  }

  async listExecutionRequests(tenantId: string) { return this.listExecutionRequestsByTenant(tenantId); }

  async updateExecutionRequest(tenantId: string, requestId: string, patch: Partial<ExecutionRequestV1>) {
    const existing = await this.getByExecutionRequestId(tenantId, requestId);
    if (!existing) return null;
    const existingMetadata = ((existing as any).metadata ?? {}) as Record<string, unknown>;
    const metadata = { ...existingMetadata, ...(patch.metadata ?? {}) };
    try {
      const [row] = await db.update(executionRequestsTable).set({ readinessState: patch.readinessState, governanceStatus: patch.governanceStatus, rollbackCoverage: patch.rollbackCoverage, metadata: metadata as any, updatedAt: new Date() }).where(eq(executionRequestsTable.id, (existing as any).id)).returning();
      return this.toV1(row);
    } catch (e) {
      if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`);
      const memRow = { ...(existing as any), ...patch, executionRequestId: patch.requestId ?? (existing as any).executionRequestId, metadata, updatedAt: new Date() };
      ExecutionRequestRepository.mem.set(this.key(tenantId, requestId), memRow);
      return this.toV1(memRow);
    }
  }

  async updateState(tenantId: string, executionRequestId: string, nextState: string) {
    const existing = await this.getByExecutionRequestId(tenantId, executionRequestId);
    if (!existing) return null;
    try {
      const [row] = await db.update(executionRequestsTable).set({ executionState: nextState, updatedAt: new Date() }).where(eq(executionRequestsTable.id, existing.id)).returning();
      return row;
    } catch (e) {
      if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`);
      const memRow = { ...existing, executionState: nextState, updatedAt: new Date() };
      ExecutionRequestRepository.mem.set(this.key(tenantId, executionRequestId), memRow);
      return memRow;
    }
  }
}
