import { createPersistenceStore, MemoryPersistenceStore } from './ai-economics-persistence';
import type {
  AICostSignal, AIEconomicAttributionLink, AIEconomicCostLink, AIEconomicInvestmentLink,
  AIEconomicProfile, AIEconomicWorkflowLink, PersistenceStore,
} from './ai-economics-types';

export interface AIEconomicsStores {
  profiles: PersistenceStore<AIEconomicProfile>;
  costSignals: PersistenceStore<AICostSignal>;
  costLinks: PersistenceStore<AIEconomicCostLink>;
  attributionLinks: PersistenceStore<AIEconomicAttributionLink>;
  workflowLinks: PersistenceStore<AIEconomicWorkflowLink>;
  investmentLinks: PersistenceStore<AIEconomicInvestmentLink>;
}

export const createAIEconomicsStores = (): AIEconomicsStores => ({
  profiles: createPersistenceStore('AI_ECONOMIC_PROFILES'),
  costSignals: createPersistenceStore('AI_COST_SIGNALS'),
  costLinks: createPersistenceStore('AI_ECONOMIC_COSTS'),
  attributionLinks: createPersistenceStore('AI_ECONOMIC_ATTRIBUTIONS'),
  workflowLinks: createPersistenceStore('AI_ECONOMIC_WORKFLOWS'),
  investmentLinks: createPersistenceStore('AI_ECONOMIC_INVESTMENTS'),
});

export const createInMemoryAIEconomicsStores = (): AIEconomicsStores => ({
  profiles: new MemoryPersistenceStore('AI_ECONOMIC_PROFILES'),
  costSignals: new MemoryPersistenceStore('AI_COST_SIGNALS'),
  costLinks: new MemoryPersistenceStore('AI_ECONOMIC_COSTS'),
  attributionLinks: new MemoryPersistenceStore('AI_ECONOMIC_ATTRIBUTIONS'),
  workflowLinks: new MemoryPersistenceStore('AI_ECONOMIC_WORKFLOWS'),
  investmentLinks: new MemoryPersistenceStore('AI_ECONOMIC_INVESTMENTS'),
});

export class AIEconomicsRepository {
  constructor(private readonly s: AIEconomicsStores = createAIEconomicsStores()) {}

  upsertProfile(v: AIEconomicProfile) { return this.s.profiles.upsert(v); }
  getProfile(t: string, id: string) { return this.s.profiles.get(t, id); }
  listProfiles(t: string, f: Record<string, unknown> = {}) { return this.s.profiles.list(t, f); }

  upsertCostSignal(v: AICostSignal) { return this.s.costSignals.upsert(v); }
  getCostSignal(t: string, id: string) { return this.s.costSignals.get(t, id); }
  listCostSignals(t: string, f: Record<string, unknown> = {}) { return this.s.costSignals.list(t, f); }

  upsertCostLink(v: AIEconomicCostLink) { return this.s.costLinks.upsert(v); }
  listCostLinks(t: string, f: Record<string, unknown> = {}) { return this.s.costLinks.list(t, f); }

  upsertAttributionLink(v: AIEconomicAttributionLink) { return this.s.attributionLinks.upsert(v); }
  listAttributionLinks(t: string, f: Record<string, unknown> = {}) { return this.s.attributionLinks.list(t, f); }

  upsertWorkflowLink(v: AIEconomicWorkflowLink) { return this.s.workflowLinks.upsert(v); }
  listWorkflowLinks(t: string, f: Record<string, unknown> = {}) { return this.s.workflowLinks.list(t, f); }

  upsertInvestmentLink(v: AIEconomicInvestmentLink) { return this.s.investmentLinks.upsert(v); }
  listInvestmentLinks(t: string, f: Record<string, unknown> = {}) { return this.s.investmentLinks.list(t, f); }

  async deleteTenantAIEconomicsData(t: string) { await Promise.all(Object.values(this.s).map((x) => x.deleteTenant(t))); }
  async collectionStatus() {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.s)) out[k] = await v.size();
    return out;
  }
}

export const aiEconomicsRepository = new AIEconomicsRepository();
