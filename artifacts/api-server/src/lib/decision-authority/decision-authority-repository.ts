import { createPersistenceStore, MemoryPersistenceStore } from './decision-authority-persistence';
import type { Decision, DecisionAsset, DecisionEvidence, DecisionOutcome, DecisionPrincipal, PersistenceStore } from './decision-authority-types';

export interface DecisionAuthorityStores {
  decisions: PersistenceStore<Decision>;
  assets: PersistenceStore<DecisionAsset>;
  evidence: PersistenceStore<DecisionEvidence>;
  principals: PersistenceStore<DecisionPrincipal>;
  outcomes: PersistenceStore<DecisionOutcome>;
}

export const createDecisionAuthorityStores = (): DecisionAuthorityStores => ({
  decisions: createPersistenceStore('DECISIONS'),
  assets: createPersistenceStore('DECISION_ASSETS'),
  evidence: createPersistenceStore('DECISION_EVIDENCE'),
  principals: createPersistenceStore('DECISION_PRINCIPALS'),
  outcomes: createPersistenceStore('DECISION_OUTCOMES'),
});

export const createInMemoryDecisionAuthorityStores = (): DecisionAuthorityStores => ({
  decisions: new MemoryPersistenceStore('DECISIONS'),
  assets: new MemoryPersistenceStore('DECISION_ASSETS'),
  evidence: new MemoryPersistenceStore('DECISION_EVIDENCE'),
  principals: new MemoryPersistenceStore('DECISION_PRINCIPALS'),
  outcomes: new MemoryPersistenceStore('DECISION_OUTCOMES'),
});

export class DecisionAuthorityRepository {
  constructor(private readonly s: DecisionAuthorityStores = createDecisionAuthorityStores()) {}

  upsertDecision(v: Decision) { return this.s.decisions.upsert(v); }
  getDecision(t: string, id: string) { return this.s.decisions.get(t, id); }
  listDecisions(t: string, f: Record<string, unknown> = {}) { return this.s.decisions.list(t, f); }

  upsertDecisionAsset(v: DecisionAsset) { return this.s.assets.upsert(v); }
  getDecisionAsset(t: string, id: string) { return this.s.assets.get(t, id); }
  listDecisionAssets(t: string, f: Record<string, unknown> = {}) { return this.s.assets.list(t, f); }

  upsertDecisionEvidence(v: DecisionEvidence) { return this.s.evidence.upsert(v); }
  getDecisionEvidence(t: string, id: string) { return this.s.evidence.get(t, id); }
  listDecisionEvidence(t: string, f: Record<string, unknown> = {}) { return this.s.evidence.list(t, f); }

  upsertDecisionPrincipal(v: DecisionPrincipal) { return this.s.principals.upsert(v); }
  getDecisionPrincipal(t: string, id: string) { return this.s.principals.get(t, id); }
  listDecisionPrincipals(t: string, f: Record<string, unknown> = {}) { return this.s.principals.list(t, f); }

  upsertDecisionOutcome(v: DecisionOutcome) { return this.s.outcomes.upsert(v); }
  getDecisionOutcome(t: string, id: string) { return this.s.outcomes.get(t, id); }
  listDecisionOutcomes(t: string, f: Record<string, unknown> = {}) { return this.s.outcomes.list(t, f); }

  async deleteTenantDecisionData(t: string) { await Promise.all(Object.values(this.s).map((x) => x.deleteTenant(t))); }
  async collectionStatus() {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.s)) out[k] = await v.size();
    return out;
  }
}

export const decisionAuthorityRepository = new DecisionAuthorityRepository();
