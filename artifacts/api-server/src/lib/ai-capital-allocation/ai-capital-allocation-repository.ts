import { createPersistenceStore, MemoryPersistenceStore } from './ai-capital-allocation-persistence';
import type { AICapitalAllocation, PersistenceStore } from './ai-capital-allocation-types';

export interface AICapitalAllocationStores {
  allocations: PersistenceStore<AICapitalAllocation>;
}

export const createAICapitalAllocationStores = (): AICapitalAllocationStores => ({
  allocations: createPersistenceStore('AI_CAPITAL_ALLOCATIONS'),
});

export const createInMemoryAICapitalAllocationStores = (): AICapitalAllocationStores => ({
  allocations: new MemoryPersistenceStore('AI_CAPITAL_ALLOCATIONS'),
});

export class AICapitalAllocationRepository {
  constructor(private readonly s: AICapitalAllocationStores = createAICapitalAllocationStores()) {}

  upsertAllocation(v: AICapitalAllocation) { return this.s.allocations.upsert(v); }
  getAllocation(t: string, id: string) { return this.s.allocations.get(t, id); }
  listAllocations(t: string, f: Record<string, unknown> = {}) { return this.s.allocations.list(t, f); }

  async deleteTenantAICapitalAllocationData(t: string) { await Promise.all(Object.values(this.s).map((x) => x.deleteTenant(t))); }
  async collectionStatus() {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.s)) out[k] = await v.size();
    return out;
  }
}

export const aiCapitalAllocationRepository = new AICapitalAllocationRepository();
