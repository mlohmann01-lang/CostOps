import { generateBenchmarkOpportunities } from "../benchmarks/benchmark-opportunity-engine";
import { BenchmarkRepository } from "../benchmarks/benchmark-repository";
import { analyzeContract } from "../contracts/contract-intelligence-engine";
import { generateContractOpportunities } from "../contracts/contract-opportunity-engine";
import { ContractRepository } from "../contracts/contract-repository";
import { calculateRenewalReadiness } from "../renewals/renewal-readiness-engine";
import { generateRenewalOpportunities } from "../renewals/renewal-opportunity-engine";
import { RenewalRepository } from "../renewals/renewal-repository";
import { generateUtilizationOpportunities } from "../utilization/utilization-opportunity-engine";
import { UtilizationRepository } from "../utilization/utilization-repository";
import { assessVendorChangeImpact } from "../vcde/impact-assessment-engine";
import { generateVendorChangeOpportunities } from "../vcde/opportunity-generation-engine";
import { VendorChangeRepository } from "../vcde/vendor-change-repository";
import type { RawOpportunity } from "./opportunity-normalizer";
import { M365OpportunityProvider } from "../playbooks/m365/m365-opportunity-provider";

export interface OpportunitySourceProvider {
  source: string;
  generateOpportunities(tenantId: string): Promise<RawOpportunity[]> | RawOpportunity[];
}

export class OpportunitySourceRegistry {
  private providers = new Map<string, OpportunitySourceProvider>();
  register(provider: OpportunitySourceProvider) { this.providers.set(provider.source, provider); return this; }
  list() { return Array.from(this.providers.values()); }
}

export class VendorProvider implements OpportunitySourceProvider {
  source = "VENDOR_CHANGE";
  constructor(private readonly repo = new VendorChangeRepository()) {}
  generateOpportunities(tenantId: string) { return this.repo.list(tenantId).flatMap((change) => generateVendorChangeOpportunities(change, assessVendorChangeImpact(change, tenantId))); }
}

export class ContractProvider implements OpportunitySourceProvider {
  source = "CONTRACT";
  constructor(private readonly repo = new ContractRepository()) {}
  generateOpportunities(tenantId: string) { return this.repo.list(tenantId).flatMap((contract) => generateContractOpportunities(contract, analyzeContract(contract))); }
}

export class UtilizationProvider implements OpportunitySourceProvider {
  source = "UTILIZATION";
  constructor(private readonly repo = new UtilizationRepository()) {}
  generateOpportunities(tenantId: string) { return generateUtilizationOpportunities(this.repo.list(tenantId)); }
}

export class RenewalProvider implements OpportunitySourceProvider {
  source = "RENEWAL";
  constructor(private readonly repo = new RenewalRepository()) {}
  generateOpportunities(tenantId: string) { return this.repo.list(tenantId).flatMap((renewal) => generateRenewalOpportunities(renewal, calculateRenewalReadiness(renewal))); }
}

export class BenchmarkProvider implements OpportunitySourceProvider {
  source = "BENCHMARK";
  constructor(private readonly repo = new BenchmarkRepository()) {}
  generateOpportunities(tenantId: string) { return generateBenchmarkOpportunities(this.repo.list(tenantId)); }
}

export class TrustProvider implements OpportunitySourceProvider {
  source = "TRUST";
  generateOpportunities(tenantId: string) {
    const now = new Date().toISOString();
    return [
      { id: "opp-trust-copilot-stale-usage", tenantId, source: "TRUST", sourceReferenceId: "tf-copilot-stale-usage", title: "Copilot License Reclaim", description: "Inactive and stale-usage Copilot seats can be reclaimed after trust blockers are resolved.", domain: "M365", projectedMonthlySavings: 18000, trustScore: 82, confidenceScore: 86, urgency: "CRITICAL", readiness: "APPROVAL_REQUIRED", createdAt: now, evidence: ["trust-finding:tf-copilot-stale-usage"], reasons: ["Trust finding resolution gates governed reclaim"] },
      { id: "opp-trust-e5-owner", tenantId, source: "TRUST", sourceReferenceId: "tf-e5-owner", title: "E5 Rightsizing", description: "E5 assignment evidence indicates downgrade candidates with owner approval required.", domain: "M365", projectedMonthlySavings: 7600, trustScore: 78, confidenceScore: 80, urgency: "HIGH", readiness: "APPROVAL_REQUIRED", createdAt: now, evidence: ["trust-finding:tf-e5-owner"], reasons: ["Owner approval required"] },
      { id: "opp-trust-servicenow-owner", tenantId, source: "TRUST", sourceReferenceId: "tf-servicenow-owner", title: "ServiceNow Shelfware", description: "Missing ownership and identity conflicts are blocking unused fulfiller license review.", domain: "SERVICENOW", projectedMonthlySavings: 6400, trustScore: 61, confidenceScore: 70, urgency: "HIGH", readiness: "BLOCKED", createdAt: now, evidence: ["trust-finding:tf-servicenow-owner"], reasons: ["Ownership conflict blocks execution"] },
    ];
  }
}

export class DriftProvider implements OpportunitySourceProvider {
  source = "DRIFT";
  generateOpportunities(tenantId: string) {
    const now = new Date().toISOString();
    return [
      { id: "opp-drift-license-reassigned", tenantId, source: "DRIFT", sourceReferenceId: "drift-license-reassigned", title: "License Reassignment Drift", description: "Previously reclaimed licenses were reassigned and should be reviewed.", domain: "M365", projectedMonthlySavings: 3900, trustScore: 74, confidenceScore: 78, urgency: "HIGH", readiness: "APPROVAL_REQUIRED", status: "DRIFTED", createdAt: now, evidence: ["drift:license-reassigned"] },
      { id: "opp-drift-snowflake-autosuspend", tenantId, source: "DRIFT", sourceReferenceId: "drift-snowflake-autosuspend", title: "Snowflake Auto Suspend Drift", description: "Warehouse auto-suspend settings drifted from verified savings baseline.", domain: "SNOWFLAKE", projectedMonthlySavings: 3100, trustScore: 76, confidenceScore: 77, urgency: "MEDIUM", readiness: "APPROVAL_REQUIRED", status: "DRIFTED", createdAt: now, evidence: ["drift:snowflake-autosuspend"] },
    ];
  }
}

export function buildDefaultOpportunitySourceRegistry() {
  return new OpportunitySourceRegistry()
    .register(new TrustProvider())
    .register(new VendorProvider())
    .register(new RenewalProvider())
    .register(new BenchmarkProvider())
    .register(new ContractProvider())
    .register(new UtilizationProvider())
    .register(new DriftProvider())
    .register(new M365OpportunityProvider());
}
