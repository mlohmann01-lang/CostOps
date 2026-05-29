import { and, eq } from "drizzle-orm";
import { db, governedRecommendationsTable } from "@workspace/db";
import type { GovernedRecommendationObject } from "./types";
import { evaluateReadiness } from "./readiness-engine";

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

function fallbackAllowed(): boolean {
  const env = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();
  return env === "development" || env === "dev" || env === "test";
}

export class GovernedRecommendationRepository {
  private static readonly memory = new Map<string, any>();
  private key(tenantId: string, recommendationId: string) { return `${tenantId}:${recommendationId}`; }
  async upsert(tenantId: string, recommendation: GovernedRecommendationObject, sourceReferences: string[] = []) {
    try {
      const [existing] = await db.select().from(governedRecommendationsTable).where(and(eq(governedRecommendationsTable.tenantId, tenantId), eq(governedRecommendationsTable.recommendationId, recommendation.recommendationId))).limit(1);

      if (!existing) {
        const { approvalSubmittedAt, executionRequestCreatedAt, ...insertRecommendation } = recommendation;
        const [row] = await db.insert(governedRecommendationsTable).values({ ...insertRecommendation, tenantId, sourceReferences, approvalSubmittedAt: approvalSubmittedAt ? new Date(approvalSubmittedAt) : null, executionRequestCreatedAt: executionRequestCreatedAt ? new Date(executionRequestCreatedAt) : null, createdAt: new Date(recommendation.createdAt), updatedAt: new Date(recommendation.updatedAt) }).returning();
        return row;
      }

    const mergedEvidence = uniq([...(existing.evidencePointers as string[]), ...recommendation.evidencePointers]);
    const mergedBlocked = uniq([...(existing.blockedReasons as string[]), ...recommendation.blockedReasons]);
    const existingSourceReferences = (existing.sourceReferences as string[] | undefined) ?? [];
    const hasRecordedApproval = existingSourceReferences.some((ref) => String(ref).startsWith("approval:"));
    const readinessCheck = evaluateReadiness({ lifecycleState: recommendation.discoveryLifecycleState, confidenceScore: recommendation.confidenceScore, actionRiskClass: recommendation.actionRiskClass, evidencePointers: mergedEvidence, hasApproval: hasRecordedApproval });

    const preventEscalation = existing.executionReadiness === "BLOCKED" && recommendation.recommendationState === "EXECUTION_READY" && readinessCheck.executionReadiness !== "AUTO_EXECUTE_ELIGIBLE";

      const { approvalSubmittedAt, executionRequestCreatedAt, ...updateRecommendation } = recommendation;
      const [row] = await db.update(governedRecommendationsTable).set({
      ...updateRecommendation,
      tenantId,
      evidencePointers: mergedEvidence,
      blockedReasons: mergedBlocked,
      sourceReferences: uniq([...(existing.sourceReferences as string[]), ...sourceReferences]),
      approvalSubmittedAt: approvalSubmittedAt ? new Date(approvalSubmittedAt) : null,
      executionRequestCreatedAt: executionRequestCreatedAt ? new Date(executionRequestCreatedAt) : null,
      executionReadiness: preventEscalation ? "BLOCKED" : recommendation.executionReadiness,
      recommendationState: preventEscalation ? "BLOCKED" : recommendation.recommendationState,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }).where(eq(governedRecommendationsTable.id, existing.id)).returning();

      return row;
    } catch (error) {
      if (!fallbackAllowed()) {
        throw new Error(`GOVERNED_RECOMMENDATION_DB_UNAVAILABLE_FAIL_CLOSED: ${(error as Error).message}`);
      }
      const key = this.key(tenantId, recommendation.recommendationId);
      const existing = GovernedRecommendationRepository.memory.get(key);
      const mergedEvidence = uniq([...(existing?.evidencePointers ?? []), ...recommendation.evidencePointers]);
      const mergedBlocked = uniq([...(existing?.blockedReasons ?? []), ...recommendation.blockedReasons]);
      const existingSourceReferences = (existing?.sourceReferences as string[] | undefined) ?? [];
      const hasRecordedApproval = existingSourceReferences.some((ref) => String(ref).startsWith("approval:"));
      const readinessCheck = evaluateReadiness({ lifecycleState: recommendation.discoveryLifecycleState, confidenceScore: recommendation.confidenceScore, actionRiskClass: recommendation.actionRiskClass, evidencePointers: mergedEvidence, hasApproval: hasRecordedApproval });
      const preventEscalation = existing?.executionReadiness === "BLOCKED" && recommendation.recommendationState === "EXECUTION_READY" && readinessCheck.executionReadiness !== "AUTO_EXECUTE_ELIGIBLE";
      const row = { ...recommendation, tenantId, id: existing?.id ?? Date.now(), evidencePointers: mergedEvidence, blockedReasons: mergedBlocked, sourceReferences: uniq([...(existing?.sourceReferences ?? []), ...sourceReferences]), executionReadiness: preventEscalation ? "BLOCKED" : recommendation.executionReadiness, recommendationState: preventEscalation ? "BLOCKED" : recommendation.recommendationState, createdAt: existing?.createdAt ?? new Date(), updatedAt: new Date() };
      GovernedRecommendationRepository.memory.set(key, row);
      return row;
    }
  }

  async getByRecommendationId(tenantId: string, recommendationId: string) {
    try {
      const rows = await db.select().from(governedRecommendationsTable).where(and(eq(governedRecommendationsTable.tenantId, tenantId), eq(governedRecommendationsTable.recommendationId, recommendationId))).limit(1);
      return rows[0] ?? null;
    } catch (error) {
      if (!fallbackAllowed()) {
        throw new Error(`GOVERNED_RECOMMENDATION_DB_UNAVAILABLE_FAIL_CLOSED: ${(error as Error).message}`);
      }
      return GovernedRecommendationRepository.memory.get(this.key(tenantId, recommendationId)) ?? null;
    }
  }

  async linkApprovalWorkflow(tenantId: string, recommendationId: string, link: { approvalWorkflowId: string; approvalSubmittedAt: string | Date; approvalState: string; currentApprovalStage: string }) {
    try {
      const [existing] = await db.select().from(governedRecommendationsTable).where(and(eq(governedRecommendationsTable.tenantId, tenantId), eq(governedRecommendationsTable.recommendationId, recommendationId))).limit(1);
      if (!existing) return null;
      const [row] = await db.update(governedRecommendationsTable).set({
        approvalWorkflowId: link.approvalWorkflowId,
        approvalSubmittedAt: new Date(link.approvalSubmittedAt),
        approvalState: link.approvalState,
        currentApprovalStage: link.currentApprovalStage,
        sourceReferences: uniq([...(existing.sourceReferences as string[]), `approval:${link.approvalWorkflowId}`]),
        updatedAt: new Date(),
      }).where(eq(governedRecommendationsTable.id, existing.id)).returning();
      return row ?? null;
    } catch (error) {
      if (!fallbackAllowed()) {
        throw new Error(`GOVERNED_RECOMMENDATION_DB_UNAVAILABLE_FAIL_CLOSED: ${(error as Error).message}`);
      }
      const key = this.key(tenantId, recommendationId);
      const existing = GovernedRecommendationRepository.memory.get(key);
      if (!existing) return null;
      const row = {
        ...existing,
        approvalWorkflowId: link.approvalWorkflowId,
        approvalSubmittedAt: new Date(link.approvalSubmittedAt),
        approvalState: link.approvalState,
        currentApprovalStage: link.currentApprovalStage,
        sourceReferences: uniq([...(existing.sourceReferences ?? []), `approval:${link.approvalWorkflowId}`]),
        updatedAt: new Date(),
      };
      GovernedRecommendationRepository.memory.set(key, row);
      return row;
    }
  }


  async linkExecutionRequest(tenantId: string, recommendationId: string, link: { executionRequestId: string; executionRequestCreatedAt: string | Date; executionRequestState: string }) {
    try {
      const [existing] = await db.select().from(governedRecommendationsTable).where(and(eq(governedRecommendationsTable.tenantId, tenantId), eq(governedRecommendationsTable.recommendationId, recommendationId))).limit(1);
      if (!existing) return null;
      const [row] = await db.update(governedRecommendationsTable).set({
        executionRequestId: link.executionRequestId,
        executionRequestCreatedAt: new Date(link.executionRequestCreatedAt),
        executionRequestState: link.executionRequestState,
        sourceReferences: uniq([...(existing.sourceReferences as string[]), `execution-request:${link.executionRequestId}`]),
        updatedAt: new Date(),
      }).where(eq(governedRecommendationsTable.id, existing.id)).returning();
      return row ?? null;
    } catch (error) {
      if (!fallbackAllowed()) {
        throw new Error(`GOVERNED_RECOMMENDATION_DB_UNAVAILABLE_FAIL_CLOSED: ${(error as Error).message}`);
      }
      const key = this.key(tenantId, recommendationId);
      const existing = GovernedRecommendationRepository.memory.get(key);
      if (!existing) return null;
      const row = {
        ...existing,
        executionRequestId: link.executionRequestId,
        executionRequestCreatedAt: new Date(link.executionRequestCreatedAt),
        executionRequestState: link.executionRequestState,
        sourceReferences: uniq([...(existing.sourceReferences ?? []), `execution-request:${link.executionRequestId}`]),
        updatedAt: new Date(),
      };
      GovernedRecommendationRepository.memory.set(key, row);
      return row;
    }
  }

  async list(tenantId: string, filters?: { readiness?: string; state?: string; playbookId?: string }) {
    let rows: any[] = [];
    try {
      rows = await db.select().from(governedRecommendationsTable).where(eq(governedRecommendationsTable.tenantId, tenantId));
    } catch (error) {
      if (!fallbackAllowed()) {
        throw new Error(`GOVERNED_RECOMMENDATION_DB_UNAVAILABLE_FAIL_CLOSED: ${(error as Error).message}`);
      }
      rows = Array.from(GovernedRecommendationRepository.memory.values()).filter((r) => r.tenantId === tenantId);
    }
    return rows.filter((r) => (!filters?.readiness || r.executionReadiness === filters.readiness) && (!filters?.state || r.recommendationState === filters.state) && (!filters?.playbookId || r.playbookId === filters.playbookId));
  }
}
