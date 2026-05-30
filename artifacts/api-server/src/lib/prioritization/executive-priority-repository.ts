import { OpportunityRepository } from "../opportunities/opportunity-repository";
import { prioritizeExecutiveOpportunities } from "./executive-prioritization-engine";
import { buildExecutiveSummary } from "./executive-summary-engine";

export class ExecutivePriorityRepository {
  constructor(private readonly opportunities = new OpportunityRepository()) {}
  listPriorities(tenantId: string) { return prioritizeExecutiveOpportunities(this.opportunities.list(tenantId)); }
  listTopPriorities(tenantId: string, limit = 5) { return this.listPriorities(tenantId).slice(0, limit); }
  getPriority(tenantId: string, priorityId: string) { return this.listPriorities(tenantId).find((priority) => priority.priorityId === priorityId) ?? null; }
  getSummary(tenantId: string) { return buildExecutiveSummary(tenantId, this.listPriorities(tenantId)); }
}
