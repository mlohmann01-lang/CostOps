import type { Contract } from "./contract-types";
import { calculateContractRisk } from "./contract-risk-engine";

const seedContracts: Omit<Contract, "tenantId" | "riskLevel">[] = [
  { id: "con-microsoft-ea", vendor: "MICROSOFT", contractName: "Microsoft Enterprise Agreement", startDate: "2024-09-01", endDate: "2026-08-31", annualValue: 420000, autoRenew: true, commitmentValue: 390000, unusedValue: 68000 },
  { id: "con-aws-edp", vendor: "AWS", contractName: "AWS EDP", startDate: "2024-10-01", endDate: "2026-09-30", annualValue: 850000, autoRenew: false, commitmentValue: 780000, unusedValue: 104000 },
  { id: "con-snowflake", vendor: "SNOWFLAKE", contractName: "Snowflake Commitment", startDate: "2025-01-01", endDate: "2026-12-31", annualValue: 180000, autoRenew: true, commitmentValue: 160000, unusedValue: 22000 },
  { id: "con-adobe", vendor: "ADOBE", contractName: "Adobe Enterprise", startDate: "2025-02-01", endDate: "2027-01-31", annualValue: 96000, autoRenew: true, commitmentValue: 90000, unusedValue: 11000 },
  { id: "con-servicenow", vendor: "SERVICENOW", contractName: "ServiceNow Platform", startDate: "2024-08-01", endDate: "2026-07-31", annualValue: 320000, autoRenew: false, commitmentValue: 300000, unusedValue: 35000 },
  { id: "con-salesforce", vendor: "SALESFORCE", contractName: "Salesforce Enterprise", startDate: "2025-04-01", endDate: "2027-03-31", annualValue: 260000, autoRenew: false, commitmentValue: 245000, unusedValue: 0 },
];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export class ContractRepository {
  private static rows = new Map<string, Contract>();
  constructor() { this.ensureTenant("default"); }
  ensureTenant(tenantId: string) { for (const seed of seedContracts) { const contract = { ...clone(seed), tenantId } as Contract; contract.riskLevel = calculateContractRisk(contract); const key = this.key(tenantId, contract.id); if (!ContractRepository.rows.has(key)) ContractRepository.rows.set(key, contract); } }
  list(tenantId: string) { this.ensureTenant(tenantId); return Array.from(ContractRepository.rows.values()).filter((row) => row.tenantId === tenantId).sort((a, b) => b.unusedValue - a.unusedValue); }
  highRisk(tenantId: string) { return this.list(tenantId).filter((contract) => calculateContractRisk(contract) === "HIGH"); }
  getById(tenantId: string, id: string) { return this.list(tenantId).find((contract) => contract.id === id) ?? null; }
  clearForTests() { ContractRepository.rows.clear(); }
  private key(tenantId: string, id: string) { return `${tenantId}:${id}`; }
}
