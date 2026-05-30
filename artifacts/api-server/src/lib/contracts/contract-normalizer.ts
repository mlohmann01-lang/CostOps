import type { Opportunity } from "../opportunities/opportunity-types";
import type { ContractOpportunity } from "./contract-types";

export function contractOpportunityToOpportunity(opportunity: ContractOpportunity): Opportunity {
  const { contractId: _contractId, riskLevel: _riskLevel, ...canonical } = opportunity;
  return canonical;
}
