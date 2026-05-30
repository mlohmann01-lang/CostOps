import type { Opportunity } from "./opportunity-types";
import { driftAlertToOpportunity, renewalOpportunityToOpportunity, trustFindingToOpportunity, vendorChangeToOpportunity, type DriftAlert } from "./opportunity-normalizer";
import type { TrustFinding } from "../trust/trust-types";
import type { StoredVendorChangeEvent } from "../vcde/vendor-change-types";
import type { RenewalOpportunity } from "../renewals/renewal-types";
import type { BenchmarkOpportunity } from "../benchmarks/benchmark-types";
import { benchmarkOpportunityToOpportunity } from "../benchmarks/benchmark-normalizer";
import type { ContractOpportunity } from "../contracts/contract-types";
import { contractOpportunityToOpportunity } from "../contracts/contract-normalizer";
import type { UtilizationOpportunity } from "../utilization/utilization-types";
import { utilizationOpportunityToOpportunity } from "../utilization/utilization-normalizer";

export type OpportunityFactoryInput = { trustFindings?: TrustFinding[]; vendorChanges?: StoredVendorChangeEvent[]; driftAlerts?: DriftAlert[]; utilizationSignals?: Opportunity[]; renewalOpportunities?: RenewalOpportunity[]; benchmarkOpportunities?: BenchmarkOpportunity[]; contractOpportunities?: ContractOpportunity[]; utilizationOpportunities?: UtilizationOpportunity[] };

export function buildOpportunities(input: OpportunityFactoryInput): Opportunity[] {
  return [
    ...(input.trustFindings ?? []).map(trustFindingToOpportunity),
    ...(input.vendorChanges ?? []).map(vendorChangeToOpportunity),
    ...(input.driftAlerts ?? []).map(driftAlertToOpportunity),
    ...(input.renewalOpportunities ?? []).map(renewalOpportunityToOpportunity),
    ...(input.benchmarkOpportunities ?? []).map(benchmarkOpportunityToOpportunity),
    ...(input.contractOpportunities ?? []).map(contractOpportunityToOpportunity),
    ...(input.utilizationOpportunities ?? []).map(utilizationOpportunityToOpportunity),
    ...(input.utilizationSignals ?? []),
  ];
}
