import { RecommendationGovernanceEventRepository, type GovernanceEventType } from "./governance-event-repository";

export class RecommendationGovernanceEventService {
  constructor(private readonly repo: RecommendationGovernanceEventRepository = new RecommendationGovernanceEventRepository()) {}
  async emit(input: { tenantId: string; recommendationId: string; eventType: GovernanceEventType; actorId: string; actorRole: string; eventReason?: string; beforeState?: string; afterState?: string; beforeReadiness?: string; afterReadiness?: string; evidenceSnapshot?: unknown[]; approvalSnapshot?: Record<string, unknown>; blockedReasonsSnapshot?: unknown[]; readinessReasonsSnapshot?: unknown[]; }) {
    return this.repo.append({ ...input, eventReason: input.eventReason ?? "", beforeState: input.beforeState ?? "", afterState: input.afterState ?? "", beforeReadiness: input.beforeReadiness ?? "", afterReadiness: input.afterReadiness ?? "", evidenceSnapshot: input.evidenceSnapshot ?? [], approvalSnapshot: input.approvalSnapshot ?? {}, blockedReasonsSnapshot: input.blockedReasonsSnapshot ?? [], readinessReasonsSnapshot: input.readinessReasonsSnapshot ?? [] });
  }
  async list(tenantId: string, recommendationId: string) { return this.repo.list(tenantId, recommendationId); }
}
