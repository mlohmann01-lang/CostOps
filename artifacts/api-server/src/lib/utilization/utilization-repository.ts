import { calculateUtilization } from "./utilization-engine";
import type { UtilizationInput, UtilizationPlatform, UtilizationRecord } from "./utilization-types";

const seedInputs: UtilizationInput[] = [
  { id: "util-copilot", tenantId: "default", platform: "COPILOT", resourceName: "Copilot", assignedCount: 320, activeCount: 84, monthlyCost: 21000, lastActivityAt: "2026-05-29T10:00:00.000Z" },
  { id: "util-m365-e5", tenantId: "default", platform: "M365", resourceName: "Microsoft 365 E5", assignedCount: 860, activeCount: 310, monthlyCost: 49200, lastActivityAt: "2026-05-28T10:00:00.000Z" },
  { id: "util-snowflake", tenantId: "default", platform: "SNOWFLAKE", resourceName: "Snowflake XL Warehouse", assignedCount: 12, activeCount: 2, monthlyCost: 18000, lastActivityAt: "2026-05-20T10:00:00.000Z" },
  { id: "util-salesforce", tenantId: "default", platform: "SALESFORCE", resourceName: "Sales Cloud Enterprise", assignedCount: 540, activeCount: 260, monthlyCost: 37800, lastActivityAt: "2026-05-27T10:00:00.000Z" },
  { id: "util-adobe", tenantId: "default", platform: "ADOBE", resourceName: "Adobe Creative Cloud", assignedCount: 220, activeCount: 0, monthlyCost: 15400, lastActivityAt: "2026-04-30T10:00:00.000Z" },
  { id: "util-aws-ri", tenantId: "default", platform: "AWS", resourceName: "AWS Reserved Capacity", assignedCount: 1800, activeCount: 1450, monthlyCost: 72000, lastActivityAt: "2026-05-30T10:00:00.000Z" },
  { id: "util-databricks", tenantId: "default", platform: "DATABRICKS", resourceName: "Databricks SQL Warehouse", assignedCount: 36, activeCount: 16, monthlyCost: 24000, lastActivityAt: "2026-05-26T10:00:00.000Z" },
];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export class UtilizationRepository {
  private static rows = new Map<string, UtilizationRecord>();
  constructor() { this.ensureTenant("default"); }
  private key(tenantId: string, id: string) { return `${tenantId}:${id}`; }
  ensureTenant(tenantId: string) { for (const seed of seedInputs) { const key = this.key(tenantId, seed.id); if (!UtilizationRepository.rows.has(key)) UtilizationRepository.rows.set(key, calculateUtilization({ ...clone(seed), tenantId })); } }
  list(tenantId: string) { this.ensureTenant(tenantId); return Array.from(UtilizationRepository.rows.values()).filter((row) => row.tenantId === tenantId); }
  byPlatform(tenantId: string, platform: UtilizationPlatform | string) { return this.list(tenantId).filter((row) => row.platform === String(platform).toUpperCase()); }
  low(tenantId: string) { return this.list(tenantId).filter((row) => row.utilizationBand === "LOW" || row.utilizationBand === "UNUSED"); }
  getById(tenantId: string, id: string) { return this.list(tenantId).find((row) => row.id === id) ?? null; }
  clearForTests() { UtilizationRepository.rows.clear(); }
}
