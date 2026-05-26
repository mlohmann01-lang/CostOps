import { GovernedRecommendationRepository } from "../recommendations/recommendation-repository";
import { RecommendationGovernanceEventService } from "../recommendations/governance-event-service";
import { ExecutionRequestRepository } from "./execution-request-repository";
import { ExecutionDryRunRepository } from "./dry-run-repository";
import { simulateExecutionRequest } from "./dry-run-simulator";

export class ExecutionDryRunService {
  constructor(
    private readonly requests = new ExecutionRequestRepository(),
    private readonly recommendations = new GovernedRecommendationRepository(),
    private readonly events = new RecommendationGovernanceEventService(),
    private readonly dryRuns = new ExecutionDryRunRepository(),
  ) {}

  async run(tenantId: string, executionRequestId: string) {
    const req = await this.requests.getByExecutionRequestId(tenantId, executionRequestId);
    if (!req) return null;
    const rec = await this.recommendations.getByRecommendationId(tenantId, String(req.recommendationId));
    if (!rec) return null;
    let ev:any[]=[]; try{ev=await this.events.list(tenantId,String(req.recommendationId));}catch{ev=[];}
    const approvalIds = ev.filter((x)=>x.eventType==="RECOMMENDATION_APPROVED").map((x)=>String(x.id));
    const sim = simulateExecutionRequest({
      simulationId: `sim_${Date.now()}`,
      executionRequestId: String(req.executionRequestId),
      actionType: String(req.actionType),
      executionState: String(req.executionState),
      expiresAt: new Date(req.expiresAt),
      recommendationState: String(rec.recommendationState),
      lifecycleState: String(rec.discoveryLifecycleState),
      evidencePointers: rec.evidencePointers as string[],
      approvalEventIds: approvalIds,
      projectedMonthlySavings: Number(rec.projectedMonthlySavings),
      targetEntityId: String(req.targetEntityId),
      policyBlocks: [],
    });
    return this.dryRuns.create({ ...sim, tenantId, simulatedAt: new Date(sim.simulatedAt) });
  }

  async getLatest(tenantId:string, executionRequestId:string){ return this.dryRuns.latest(tenantId, executionRequestId); }
}
