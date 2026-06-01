import type { Opportunity, OpportunityDomain, OpportunitySource, OpportunitySummary, RankedOpportunity } from "./opportunity-types";
import { rankOpportunities } from "./opportunity-prioritizer";

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export class OpportunityRepository {
  private static rows = new Map<string, Opportunity>();

  list(tenantId: string): RankedOpportunity[] { return rankOpportunities(Array.from(OpportunityRepository.rows.values()).filter((row) => row.tenantId === tenantId)); }
  top(tenantId: string, limit = 3) { return this.list(tenantId).slice(0, limit); }
  getById(tenantId: string, id: string) { return this.list(tenantId).find((row) => row.id === id) ?? null; }
  getBySource(tenantId: string, source: OpportunitySource) { return this.list(tenantId).filter((row) => row.source === source || row.sources?.includes(source)); }
  getByDomain(tenantId: string, domain: OpportunityDomain | string) { return this.list(tenantId).filter((row) => row.domain === String(domain).toUpperCase()); }

  upsert(tenantId: string, opportunity: Opportunity) {
    const existing = OpportunityRepository.rows.get(this.key(tenantId, opportunity.id));
    const merged: Opportunity = existing
      ? { ...existing, ...clone(opportunity), tenantId, createdAt: existing.createdAt, updatedAt: opportunity.updatedAt, sources: Array.from(new Set([...(existing.sources ?? [existing.source]), ...(opportunity.sources ?? [opportunity.source])])), reasons: Array.from(new Set([...(existing.reasons ?? []), ...(opportunity.reasons ?? [])])), evidence: [...(existing.evidence ?? []), ...(opportunity.evidence ?? [])] }
      : { ...clone(opportunity), tenantId };
    OpportunityRepository.rows.set(this.key(tenantId, merged.id), merged);
    return { opportunity: merged, created: !existing };
  }

  upsertMany(tenantId: string, opportunities: Opportunity[]) { return opportunities.map((opportunity) => this.upsert(tenantId, opportunity)); }
  replaceTenant(tenantId: string, opportunities: Opportunity[]) { for (const row of this.list(tenantId)) OpportunityRepository.rows.delete(this.key(tenantId, row.id)); return this.upsertMany(tenantId, opportunities); }

  summary(tenantId: string): OpportunitySummary {
    const rows = this.list(tenantId);
    return {
      openOpportunities: rows.filter((row) => row.status !== "CLOSED").length,
      projectedSavings: rows.reduce((sum, row) => sum + row.projectedMonthlySavings, 0),
      critical: rows.filter((row) => row.priorityBand === "CRITICAL" || row.urgency === "CRITICAL").length,
      eligible: rows.filter((row) => row.readiness === "ELIGIBLE").length,
      discovered: rows.filter((row) => row.status === "DISCOVERED").length,
      prioritized: rows.filter((row) => row.status === "PRIORITIZED").length,
      approvalPending: rows.filter((row) => row.status === "APPROVAL_PENDING" || row.readiness === "APPROVAL_REQUIRED").length,
      readyForExecution: rows.filter((row) => row.readiness === "ELIGIBLE" && ["DISCOVERED", "PRIORITIZED", "APPROVED"].includes(row.status)).length,
    };
  }

  clearForTests() { OpportunityRepository.rows.clear(); }
  private key(tenantId: string, id: string) { return `${tenantId}:${id}`; }
}
