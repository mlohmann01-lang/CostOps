import { createPersistenceStore, MemoryPersistenceStore } from './ai-value-attribution-persistence';
import type {
  AIActivity, AIActivityDecision, AIActivityOutcome, AIActivityValueSignal, AIActivityWorkflow,
  AIValueAttribution, PersistenceStore,
} from './ai-value-attribution-types';

export interface AIValueAttributionStores {
  activities: PersistenceStore<AIActivity>;
  attributions: PersistenceStore<AIValueAttribution>;
  valueSignalLinks: PersistenceStore<AIActivityValueSignal>;
  outcomeLinks: PersistenceStore<AIActivityOutcome>;
  decisionLinks: PersistenceStore<AIActivityDecision>;
  workflowLinks: PersistenceStore<AIActivityWorkflow>;
}

export const createAIValueAttributionStores = (): AIValueAttributionStores => ({
  activities: createPersistenceStore('AI_ACTIVITIES'),
  attributions: createPersistenceStore('AI_VALUE_ATTRIBUTIONS'),
  valueSignalLinks: createPersistenceStore('AI_ACTIVITY_VALUE_SIGNALS'),
  outcomeLinks: createPersistenceStore('AI_ACTIVITY_OUTCOMES'),
  decisionLinks: createPersistenceStore('AI_ACTIVITY_DECISIONS'),
  workflowLinks: createPersistenceStore('AI_ACTIVITY_WORKFLOWS'),
});

export const createInMemoryAIValueAttributionStores = (): AIValueAttributionStores => ({
  activities: new MemoryPersistenceStore('AI_ACTIVITIES'),
  attributions: new MemoryPersistenceStore('AI_VALUE_ATTRIBUTIONS'),
  valueSignalLinks: new MemoryPersistenceStore('AI_ACTIVITY_VALUE_SIGNALS'),
  outcomeLinks: new MemoryPersistenceStore('AI_ACTIVITY_OUTCOMES'),
  decisionLinks: new MemoryPersistenceStore('AI_ACTIVITY_DECISIONS'),
  workflowLinks: new MemoryPersistenceStore('AI_ACTIVITY_WORKFLOWS'),
});

export class AIValueAttributionRepository {
  constructor(private readonly s: AIValueAttributionStores = createAIValueAttributionStores()) {}

  upsertActivity(v: AIActivity) { return this.s.activities.upsert(v); }
  getActivity(t: string, id: string) { return this.s.activities.get(t, id); }
  listActivities(t: string, f: Record<string, unknown> = {}) { return this.s.activities.list(t, f); }

  upsertAttribution(v: AIValueAttribution) { return this.s.attributions.upsert(v); }
  getAttribution(t: string, id: string) { return this.s.attributions.get(t, id); }
  listAttributions(t: string, f: Record<string, unknown> = {}) { return this.s.attributions.list(t, f); }

  upsertValueSignalLink(v: AIActivityValueSignal) { return this.s.valueSignalLinks.upsert(v); }
  listValueSignalLinks(t: string, f: Record<string, unknown> = {}) { return this.s.valueSignalLinks.list(t, f); }

  upsertOutcomeLink(v: AIActivityOutcome) { return this.s.outcomeLinks.upsert(v); }
  listOutcomeLinks(t: string, f: Record<string, unknown> = {}) { return this.s.outcomeLinks.list(t, f); }

  upsertDecisionLink(v: AIActivityDecision) { return this.s.decisionLinks.upsert(v); }
  listDecisionLinks(t: string, f: Record<string, unknown> = {}) { return this.s.decisionLinks.list(t, f); }

  upsertWorkflowLink(v: AIActivityWorkflow) { return this.s.workflowLinks.upsert(v); }
  listWorkflowLinks(t: string, f: Record<string, unknown> = {}) { return this.s.workflowLinks.list(t, f); }

  async deleteTenantAIValueAttributionData(t: string) { await Promise.all(Object.values(this.s).map((x) => x.deleteTenant(t))); }
  async collectionStatus() {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.s)) out[k] = await v.size();
    return out;
  }
}

export const aiValueAttributionRepository = new AIValueAttributionRepository();
