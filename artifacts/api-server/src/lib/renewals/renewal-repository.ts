import type { Renewal } from "./renewal-types";

const seedRenewals: Omit<Renewal, "tenantId">[] = [
  { id: "ren-microsoft-e5", vendor: "MICROSOFT", contractName: "Microsoft E5", renewalDate: "2026-08-25", annualSpend: 420000, renewalRisk: "HIGH", daysRemaining: 87 },
  { id: "ren-aws-edp", vendor: "AWS", contractName: "AWS Enterprise Discount Program", renewalDate: "2026-09-27", annualSpend: 850000, renewalRisk: "MEDIUM", daysRemaining: 120 },
  { id: "ren-snowflake", vendor: "SNOWFLAKE", contractName: "Snowflake", renewalDate: "2026-07-11", annualSpend: 180000, renewalRisk: "HIGH", daysRemaining: 42 },
  { id: "ren-servicenow", vendor: "SERVICENOW", contractName: "ServiceNow", renewalDate: "2026-08-01", annualSpend: 320000, renewalRisk: "MEDIUM", daysRemaining: 63 },
  { id: "ren-salesforce", vendor: "SALESFORCE", contractName: "Salesforce Sales Cloud", renewalDate: "2026-10-15", annualSpend: 260000, renewalRisk: "LOW", daysRemaining: 138 },
  { id: "ren-adobe", vendor: "ADOBE", contractName: "Adobe Enterprise", renewalDate: "2026-11-01", annualSpend: 140000, renewalRisk: "LOW", daysRemaining: 155 },
  { id: "ren-databricks", vendor: "DATABRICKS", contractName: "Databricks Platform", renewalDate: "2026-12-18", annualSpend: 230000, renewalRisk: "MEDIUM", daysRemaining: 202 },
];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export class RenewalRepository {
  private static rows = new Map<string, Renewal>();
  constructor() { this.ensureTenant("default"); }
  ensureTenant(tenantId: string) { for (const renewal of seedRenewals) { const key = this.key(tenantId, renewal.id); if (!RenewalRepository.rows.has(key)) RenewalRepository.rows.set(key, { ...clone(renewal), tenantId }); } }
  list(tenantId: string) { this.ensureTenant(tenantId); return Array.from(RenewalRepository.rows.values()).filter((row) => row.tenantId === tenantId).sort((a, b) => a.daysRemaining - b.daysRemaining); }
  getById(tenantId: string, id: string) { return this.list(tenantId).find((row) => row.id === id) ?? null; }
  upcoming(tenantId: string, windowDays = 120) { return this.list(tenantId).filter((row) => row.daysRemaining <= windowDays); }
  highRisk(tenantId: string) { return this.list(tenantId).filter((row) => row.renewalRisk === "HIGH"); }
  clearForTests() { RenewalRepository.rows.clear(); }
  private key(tenantId: string, id: string) { return `${tenantId}:${id}`; }
}
