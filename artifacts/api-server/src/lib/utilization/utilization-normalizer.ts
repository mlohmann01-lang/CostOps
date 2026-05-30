import type { Opportunity } from "../opportunities/opportunity-types";
import type { UtilizationOpportunity } from "./utilization-types";

export function utilizationOpportunityToOpportunity(opportunity: UtilizationOpportunity): Opportunity {
  const { utilizationRecordId: _utilizationRecordId, utilizationBand: _utilizationBand, ...canonical } = opportunity;
  return canonical;
}
