import type { Contract, ContractIntelligence, ContractSummary } from "./contract-types";
import { generateContractOpportunities } from "./contract-opportunity-engine";
import { calculateContractRisk } from "./contract-risk-engine";

export function analyzeContract(contract: Contract): ContractIntelligence {
  const renewalRisk = calculateContractRisk(contract);
  const priceIncreaseExposure = Math.round(contract.annualValue * (renewalRisk === "HIGH" ? 0.08 : renewalRisk === "MEDIUM" ? 0.045 : 0.02));
  const commitmentExposure = Math.max(0, contract.commitmentValue - (contract.annualValue - contract.unusedValue));
  const autoRenewalExposure = contract.autoRenew ? Math.round(contract.annualValue * 0.15) : 0;
  const trueUpExposure = Math.round(Math.max(0, contract.annualValue - contract.commitmentValue) * 0.08);
  return { contractId: contract.id, unusedSpend: contract.unusedValue, commitmentExposure, renewalRisk, priceIncreaseExposure, autoRenewalExposure, trueUpExposure };
}

export function summarizeContracts(contracts: Contract[]): ContractSummary {
  return { contracts: contracts.length, atRisk: contracts.filter((contract) => calculateContractRisk(contract) === "HIGH").length, unusedValue: contracts.reduce((sum, contract) => sum + contract.unusedValue, 0), generatedOpportunities: contracts.reduce((sum, contract) => sum + generateContractOpportunities(contract, analyzeContract(contract)).length, 0) };
}

export function buildContractIntelligenceRow(contract: Contract) {
  return { ...contract, riskLevel: calculateContractRisk(contract), intelligence: analyzeContract(contract) };
}
