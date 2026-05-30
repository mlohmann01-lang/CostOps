import type { Contract, ContractRiskLevel } from "./contract-types";

export function calculateContractRisk(contract: Contract): ContractRiskLevel {
  const unusedRatio = contract.annualValue > 0 ? contract.unusedValue / contract.annualValue : 0;
  const commitmentRatio = contract.commitmentValue > 0 ? contract.unusedValue / contract.commitmentValue : 0;
  if (unusedRatio >= 0.12 || (contract.autoRenew && commitmentRatio >= 0.1)) return "HIGH";
  if (unusedRatio >= 0.08 || commitmentRatio >= 0.06 || contract.autoRenew) return "MEDIUM";
  return "LOW";
}
