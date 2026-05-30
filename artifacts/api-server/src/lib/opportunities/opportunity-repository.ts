import type { Opportunity, OpportunityDomain, OpportunitySource, OpportunitySummary, RankedOpportunity } from "./opportunity-types";
import { rankOpportunities } from "./opportunity-prioritizer";

const now = "2026-05-30T12:00:00.000Z";
const seedOpportunities: Omit<Opportunity, "tenantId">[] = [
  { id: "opp-copilot-reclaim", source: "TRUST", title: "Copilot License Reclaim", description: "Inactive and stale-usage Copilot seats can be reclaimed after trust blockers are resolved.", domain: "M365", projectedMonthlySavings: 18000, trustScore: 82, confidenceScore: 86, urgency: "CRITICAL", readiness: "APPROVAL_REQUIRED", sourceReferenceId: "tf-copilot-stale-usage", createdAt: now },
  { id: "opp-e5-rightsizing", source: "TRUST", title: "E5 Rightsizing", description: "E5 assignment evidence indicates downgrade candidates with owner approval required.", domain: "M365", projectedMonthlySavings: 7600, trustScore: 78, confidenceScore: 80, urgency: "HIGH", readiness: "APPROVAL_REQUIRED", sourceReferenceId: "tf-e5-owner", createdAt: now },
  { id: "opp-servicenow-shelfware", source: "TRUST", title: "ServiceNow Shelfware", description: "Missing ownership and identity conflicts are blocking unused fulfiller license review.", domain: "SERVICENOW", projectedMonthlySavings: 6400, trustScore: 61, confidenceScore: 70, urgency: "HIGH", readiness: "BLOCKED", sourceReferenceId: "tf-servicenow-owner", createdAt: now },
  { id: "opp-m365-owner-cleanup", source: "TRUST", title: "M365 Owner Cleanup", description: "Assign cost centres to unlock governed license reclaim candidates.", domain: "M365", projectedMonthlySavings: 4300, trustScore: 68, confidenceScore: 72, urgency: "MEDIUM", readiness: "BLOCKED", sourceReferenceId: "tf-missing-owner", createdAt: now },
  { id: "opp-aws-rightsizing-wave", source: "VENDOR_CHANGE", title: "AWS Rightsizing Wave", description: "New Graviton economics creates rightsizing and migration opportunities.", domain: "AWS", projectedMonthlySavings: 11000, trustScore: 84, confidenceScore: 82, urgency: "HIGH", readiness: "ELIGIBLE", sourceReferenceId: "vc-aws-graviton-savings", createdAt: now },
  { id: "opp-snowflake-credits", source: "VENDOR_CHANGE", title: "Snowflake Optimization", description: "Updated warehouse credit guidance can reduce over-provisioned warehouses.", domain: "SNOWFLAKE", projectedMonthlySavings: 9200, trustScore: 81, confidenceScore: 79, urgency: "HIGH", readiness: "ELIGIBLE", sourceReferenceId: "vc-snowflake-credit-guidance", createdAt: now },
  { id: "opp-adobe-migration", source: "VENDOR_CHANGE", title: "Adobe SKU Migration", description: "Retired SKU notice requires governed migration and reclaim review.", domain: "M365", projectedMonthlySavings: 2400, trustScore: 75, confidenceScore: 74, urgency: "MEDIUM", readiness: "MANUAL_ONLY", sourceReferenceId: "vc-adobe-retirement", createdAt: now },
  { id: "opp-license-reassignment-drift", source: "DRIFT", title: "License Reassignment Drift", description: "Previously reclaimed licenses were reassigned and should be reviewed.", domain: "M365", projectedMonthlySavings: 3900, trustScore: 74, confidenceScore: 78, urgency: "HIGH", readiness: "APPROVAL_REQUIRED", sourceReferenceId: "drift-license-reassigned", createdAt: now },
  { id: "opp-snowflake-drift", source: "DRIFT", title: "Snowflake Auto Suspend Drift", description: "Warehouse auto-suspend settings drifted from verified savings baseline.", domain: "SNOWFLAKE", projectedMonthlySavings: 3100, trustScore: 76, confidenceScore: 77, urgency: "MEDIUM", readiness: "APPROVAL_REQUIRED", sourceReferenceId: "drift-snowflake-autosuspend", createdAt: now },
  { id: "opp-databricks-resize", source: "UTILIZATION", title: "Databricks Warehouse Resize", description: "Cluster utilization profile supports a smaller warehouse class.", domain: "DATABRICKS", projectedMonthlySavings: 8200, trustScore: 80, confidenceScore: 81, urgency: "HIGH", readiness: "ELIGIBLE", sourceReferenceId: "util-databricks-warehouse", createdAt: now },
  { id: "opp-openai-routing", source: "UTILIZATION", title: "OpenAI Routing Optimization", description: "AI runtime traffic can route lower-risk requests to cheaper models.", domain: "AI_RUNTIME", projectedMonthlySavings: 5800, trustScore: 79, confidenceScore: 76, urgency: "MEDIUM", readiness: "ELIGIBLE", sourceReferenceId: "util-openai-routing", createdAt: now },
  { id: "opp-azure-commit", source: "UTILIZATION", title: "Azure Commit Coverage", description: "Utilization telemetry indicates uncovered workloads eligible for commitment review.", domain: "AZURE", projectedMonthlySavings: 5100, trustScore: 77, confidenceScore: 75, urgency: "MEDIUM", readiness: "APPROVAL_REQUIRED", sourceReferenceId: "util-azure-commit", createdAt: now },
];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export class OpportunityRepository {
  private static rows = new Map<string, Opportunity>();
  constructor() { this.ensureTenant("default"); }
  ensureTenant(tenantId: string) { for (const opp of seedOpportunities) { const key = this.key(tenantId, opp.id); if (!OpportunityRepository.rows.has(key)) OpportunityRepository.rows.set(key, { ...clone(opp), tenantId }); } }
  list(tenantId: string): RankedOpportunity[] { this.ensureTenant(tenantId); return rankOpportunities(Array.from(OpportunityRepository.rows.values()).filter((row) => row.tenantId === tenantId)); }
  top(tenantId: string, limit = 3) { return this.list(tenantId).slice(0, limit); }
  getById(tenantId: string, id: string) { return this.list(tenantId).find((row) => row.id === id) ?? null; }
  getBySource(tenantId: string, source: OpportunitySource) { return this.list(tenantId).filter((row) => row.source === source); }
  getByDomain(tenantId: string, domain: OpportunityDomain | string) { return this.list(tenantId).filter((row) => row.domain === String(domain).toUpperCase()); }
  summary(tenantId: string): OpportunitySummary { const rows = this.list(tenantId); return { openOpportunities: rows.length, projectedSavings: rows.reduce((sum, row) => sum + row.projectedMonthlySavings, 0), critical: rows.filter((row) => row.priorityBand === "CRITICAL" || row.urgency === "CRITICAL").length, eligible: rows.filter((row) => row.readiness === "ELIGIBLE").length }; }
  clearForTests() { OpportunityRepository.rows.clear(); }
  private key(tenantId: string, id: string) { return `${tenantId}:${id}`; }
}
