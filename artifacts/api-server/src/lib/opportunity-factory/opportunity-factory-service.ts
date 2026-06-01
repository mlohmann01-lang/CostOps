import { platformEventService } from "../events/platform-event-service";
import type { Opportunity } from "../opportunities/opportunity-types";
import { OpportunityRepository } from "../opportunities/opportunity-repository";
import { normalizeOpportunities } from "./opportunity-normalizer";
import { buildDefaultOpportunitySourceRegistry, type OpportunitySourceProvider, type OpportunitySourceRegistry } from "./opportunity-source-registry";

export type OpportunityFactoryHealthState = "HEALTHY" | "DEGRADED" | "STALE" | "FAILED";

export interface OpportunityFactoryRunResult {
  tenantId: string;
  opportunities: Opportunity[];
  providerResults: Array<{ source: string; succeeded: boolean; generated: number; error?: string }>;
  deduplicated: number;
  persisted: number;
  summary: ReturnType<OpportunityRepository["summary"]>;
  health: OpportunityFactoryHealth;
}

export interface OpportunityFactoryHealth {
  component: "Opportunity Factory";
  state: OpportunityFactoryHealthState;
  lastRunAt: string | null;
  providersSucceeded: number;
  providersFailed: number;
  opportunitiesGenerated: number;
  dedupeSuccess: boolean;
}

const healthByTenant = new Map<string, OpportunityFactoryHealth>();

function fingerprint(opportunity: Opportunity) {
  return [
    `${opportunity.source}:${opportunity.sourceReferenceId}`,
    opportunity.entityKey ? `entity:${opportunity.entityKey}` : "",
    opportunity.recommendationKey ? `recommendation:${opportunity.recommendationKey}` : "",
    opportunity.costObjectKey ? `cost:${opportunity.costObjectKey}` : "",
  ].filter(Boolean);
}

function mergeOpportunity(existing: Opportunity, incoming: Opportunity): Opportunity {
  const winner = incoming.confidenceScore > existing.confidenceScore ? incoming : existing;
  const loser = winner === incoming ? existing : incoming;
  return {
    ...winner,
    id: existing.id,
    createdAt: existing.createdAt < incoming.createdAt ? existing.createdAt : incoming.createdAt,
    updatedAt: incoming.updatedAt > existing.updatedAt ? incoming.updatedAt : existing.updatedAt,
    projectedMonthlySavings: Math.max(existing.projectedMonthlySavings, incoming.projectedMonthlySavings),
    projectedAnnualSavings: Math.max(existing.projectedAnnualSavings, incoming.projectedAnnualSavings),
    sources: Array.from(new Set([...(existing.sources ?? [existing.source]), ...(incoming.sources ?? [incoming.source])])),
    reasons: Array.from(new Set([...(existing.reasons ?? []), ...(incoming.reasons ?? [])])),
    evidence: [...(existing.evidence ?? []), ...(incoming.evidence ?? [])],
    trustScore: Math.max(existing.trustScore, incoming.trustScore, loser.trustScore),
    confidenceScore: Math.max(existing.confidenceScore, incoming.confidenceScore),
  };
}

export function deduplicateOpportunities(opportunities: Opportunity[]) {
  const byKey = new Map<string, Opportunity>();
  const aliases = new Map<string, string>();
  let deduplicated = 0;

  for (const opportunity of opportunities) {
    const keys = fingerprint(opportunity);
    const matched = keys.map((key) => aliases.get(key)).find(Boolean);
    if (matched) {
      const existing = byKey.get(matched)!;
      const merged = mergeOpportunity(existing, opportunity);
      byKey.set(matched, merged);
      for (const key of keys) aliases.set(key, matched);
      deduplicated += 1;
    } else {
      const primary = keys[0] ?? opportunity.id;
      byKey.set(primary, opportunity);
      for (const key of keys) aliases.set(key, primary);
    }
  }

  return { opportunities: Array.from(byKey.values()), deduplicated };
}

function eventId(type: string, tenantId: string, opportunityId: string) { return `${type}:${tenantId}:${opportunityId}:${Date.now()}:${Math.random().toString(16).slice(2)}`; }
function emitOpportunityEvent(tenantId: string, opportunity: Opportunity, eventType: "OPPORTUNITY_DISCOVERED" | "OPPORTUNITY_UPDATED" | "OPPORTUNITY_DEDUPLICATED" | "OPPORTUNITY_CLOSED") {
  void platformEventService.recordOpportunityEvent(tenantId, eventType, { eventId: eventId(eventType, tenantId, opportunity.id), entityType: "OPPORTUNITY", entityId: opportunity.id, actorId: "opportunity-factory", title: `Opportunity factory ${eventType.toLowerCase()}`, description: `Opportunity factory ${eventType.toLowerCase()}`, sourceSystem: "opportunity-factory", metadata: { evidence: opportunity.evidence ?? [] }, occurredAt: opportunity.updatedAt }).catch(() => undefined);
}

export async function runOpportunityFactory(tenantId: string, input?: { registry?: OpportunitySourceRegistry; repository?: OpportunityRepository; now?: string }): Promise<OpportunityFactoryRunResult> {
  const registry = input?.registry ?? buildDefaultOpportunitySourceRegistry();
  const repository = input?.repository ?? new OpportunityRepository();
  const now = input?.now ?? new Date().toISOString();
  const raw: any[] = [];
  const providerResults: OpportunityFactoryRunResult["providerResults"] = [];

  for (const provider of registry.list() as OpportunitySourceProvider[]) {
    try {
      const generated = await provider.generateOpportunities(tenantId);
      raw.push(...generated);
      providerResults.push({ source: provider.source, succeeded: true, generated: generated.length });
    } catch (error) {
      providerResults.push({ source: provider.source, succeeded: false, generated: 0, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const normalized = normalizeOpportunities(raw, tenantId, now);
  const deduped = deduplicateOpportunities(normalized);
  const persisted = repository.upsertMany(tenantId, deduped.opportunities);
  for (const row of persisted) emitOpportunityEvent(tenantId, row.opportunity, row.created ? "OPPORTUNITY_DISCOVERED" : "OPPORTUNITY_UPDATED");
  if (deduped.deduplicated > 0) for (const opportunity of deduped.opportunities) emitOpportunityEvent(tenantId, opportunity, "OPPORTUNITY_DEDUPLICATED");

  const providersFailed = providerResults.filter((provider) => !provider.succeeded).length;
  const health: OpportunityFactoryHealth = { component: "Opportunity Factory", state: providersFailed === providerResults.length ? "FAILED" : providersFailed > 0 ? "DEGRADED" : "HEALTHY", lastRunAt: now, providersSucceeded: providerResults.length - providersFailed, providersFailed, opportunitiesGenerated: normalized.length, dedupeSuccess: deduped.opportunities.length + deduped.deduplicated === normalized.length };
  healthByTenant.set(tenantId, health);

  return { tenantId, opportunities: repository.list(tenantId), providerResults, deduplicated: deduped.deduplicated, persisted: persisted.length, summary: repository.summary(tenantId), health };
}

export function getOpportunityFactoryHealth(tenantId: string): OpportunityFactoryHealth {
  const current = healthByTenant.get(tenantId);
  if (!current) return { component: "Opportunity Factory", state: "STALE", lastRunAt: null, providersSucceeded: 0, providersFailed: 0, opportunitiesGenerated: 0, dedupeSuccess: false };
  const ageMs = Date.now() - new Date(current.lastRunAt ?? 0).getTime();
  if (Number.isFinite(ageMs) && ageMs > 24 * 60 * 60 * 1000) return { ...current, state: "STALE" };
  return current;
}
