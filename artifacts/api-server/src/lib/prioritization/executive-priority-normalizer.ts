import type { RankedOpportunity } from "../opportunities/opportunity-types";
import type { ExecutivePriority } from "./executive-priority-types";
import { scoreExecutiveOpportunity } from "./executive-prioritization-engine";

export function opportunityToExecutivePriority(opportunity: RankedOpportunity, maxMonthlySavings: number, priorityRank: number): ExecutivePriority {
  return { ...scoreExecutiveOpportunity(opportunity, maxMonthlySavings), priorityRank };
}
