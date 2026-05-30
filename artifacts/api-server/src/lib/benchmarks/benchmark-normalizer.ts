import type { Opportunity } from "../opportunities/opportunity-types";
import type { BenchmarkOpportunity } from "./benchmark-types";

export function benchmarkOpportunityToOpportunity(opportunity: BenchmarkOpportunity): Opportunity {
  const { benchmarkId: _benchmarkId, variancePercent: _variancePercent, ...canonical } = opportunity;
  return canonical;
}
