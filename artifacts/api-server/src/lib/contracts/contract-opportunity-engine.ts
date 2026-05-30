import type { Contract, ContractIntelligence, ContractOpportunity } from "./contract-types";

function domainFor(contract: Contract): ContractOpportunity["domain"] {
  if (contract.vendor === "MICROSOFT") return "M365";
  if (contract.vendor === "AWS") return "AWS";
  if (contract.vendor === "SNOWFLAKE") return "SNOWFLAKE";
  if (contract.vendor === "SALESFORCE") return "SALESFORCE";
  if (contract.vendor === "SERVICENOW") return "SERVICENOW";
  return "M365";
}

function titleFor(contract: Contract, kind: string) {
  if (contract.vendor === "SNOWFLAKE" && kind === "commitment") return "Commitment Optimization Opportunity";
  if (contract.vendor === "MICROSOFT" && kind === "renewal") return "Renewal Readiness Opportunity";
  if (contract.vendor === "ADOBE" && kind === "unused") return "License Reclaim Opportunity";
  return `${contract.contractName} ${kind} opportunity`;
}

export function generateContractOpportunities(contract: Contract, intelligence: ContractIntelligence): ContractOpportunity[] {
  const kinds = [contract.unusedValue > 0 ? "unused" : null, intelligence.commitmentExposure > 0 ? "commitment" : null, contract.autoRenew ? "renewal" : null].filter(Boolean) as string[];
  return kinds.map((kind, index) => ({ id: `opp-contract-${contract.id}-${index + 1}`, tenantId: contract.tenantId, source: "CONTRACT", contractId: contract.id, title: titleFor(contract, kind), description: `${contract.contractName} has ${kind} exposure requiring contract review before renewal or true-up.`, domain: domainFor(contract), projectedMonthlySavings: Math.round((kind === "commitment" ? intelligence.commitmentExposure : kind === "renewal" ? intelligence.autoRenewalExposure : contract.unusedValue) / 12), trustScore: intelligence.renewalRisk === "HIGH" ? 76 : 82, confidenceScore: intelligence.renewalRisk === "HIGH" ? 84 : 76, urgency: intelligence.renewalRisk === "HIGH" ? "HIGH" : "MEDIUM", readiness: intelligence.renewalRisk === "HIGH" ? "APPROVAL_REQUIRED" : "ELIGIBLE", sourceReferenceId: contract.id, createdAt: new Date().toISOString(), riskLevel: intelligence.renewalRisk }));
}
