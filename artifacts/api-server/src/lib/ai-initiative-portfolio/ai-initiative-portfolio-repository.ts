import { createPersistenceStore, MemoryPersistenceStore } from './ai-initiative-portfolio-persistence';
import type {
  AIInitiative, InitiativeAttributionLink, InitiativeEconomicsLink, InitiativeInvestmentLink,
  InitiativeOutcomeLink, InitiativePortfolioEvaluation, InitiativeWorkflowLink, PersistenceStore,
} from './ai-initiative-portfolio-types';

export interface AIInitiativePortfolioStores {
  initiatives: PersistenceStore<AIInitiative>;
  investmentLinks: PersistenceStore<InitiativeInvestmentLink>;
  workflowLinks: PersistenceStore<InitiativeWorkflowLink>;
  attributionLinks: PersistenceStore<InitiativeAttributionLink>;
  economicsLinks: PersistenceStore<InitiativeEconomicsLink>;
  outcomeLinks: PersistenceStore<InitiativeOutcomeLink>;
  evaluations: PersistenceStore<InitiativePortfolioEvaluation>;
}

export const createAIInitiativePortfolioStores = (): AIInitiativePortfolioStores => ({
  initiatives: createPersistenceStore('AI_INITIATIVES'),
  investmentLinks: createPersistenceStore('INITIATIVE_INVESTMENTS'),
  workflowLinks: createPersistenceStore('INITIATIVE_WORKFLOWS'),
  attributionLinks: createPersistenceStore('INITIATIVE_ATTRIBUTIONS'),
  economicsLinks: createPersistenceStore('INITIATIVE_ECONOMICS'),
  outcomeLinks: createPersistenceStore('INITIATIVE_OUTCOMES'),
  evaluations: createPersistenceStore('INITIATIVE_PORTFOLIO_EVALUATIONS'),
});

export const createInMemoryAIInitiativePortfolioStores = (): AIInitiativePortfolioStores => ({
  initiatives: new MemoryPersistenceStore('AI_INITIATIVES'),
  investmentLinks: new MemoryPersistenceStore('INITIATIVE_INVESTMENTS'),
  workflowLinks: new MemoryPersistenceStore('INITIATIVE_WORKFLOWS'),
  attributionLinks: new MemoryPersistenceStore('INITIATIVE_ATTRIBUTIONS'),
  economicsLinks: new MemoryPersistenceStore('INITIATIVE_ECONOMICS'),
  outcomeLinks: new MemoryPersistenceStore('INITIATIVE_OUTCOMES'),
  evaluations: new MemoryPersistenceStore('INITIATIVE_PORTFOLIO_EVALUATIONS'),
});

export class AIInitiativePortfolioRepository {
  constructor(private readonly s: AIInitiativePortfolioStores = createAIInitiativePortfolioStores()) {}

  upsertInitiative(v: AIInitiative) { return this.s.initiatives.upsert(v); }
  getInitiative(t: string, id: string) { return this.s.initiatives.get(t, id); }
  listInitiatives(t: string, f: Record<string, unknown> = {}) { return this.s.initiatives.list(t, f); }

  upsertInvestmentLink(v: InitiativeInvestmentLink) { return this.s.investmentLinks.upsert(v); }
  listInvestmentLinks(t: string, f: Record<string, unknown> = {}) { return this.s.investmentLinks.list(t, f); }

  upsertWorkflowLink(v: InitiativeWorkflowLink) { return this.s.workflowLinks.upsert(v); }
  listWorkflowLinks(t: string, f: Record<string, unknown> = {}) { return this.s.workflowLinks.list(t, f); }

  upsertAttributionLink(v: InitiativeAttributionLink) { return this.s.attributionLinks.upsert(v); }
  listAttributionLinks(t: string, f: Record<string, unknown> = {}) { return this.s.attributionLinks.list(t, f); }

  upsertEconomicsLink(v: InitiativeEconomicsLink) { return this.s.economicsLinks.upsert(v); }
  listEconomicsLinks(t: string, f: Record<string, unknown> = {}) { return this.s.economicsLinks.list(t, f); }

  upsertOutcomeLink(v: InitiativeOutcomeLink) { return this.s.outcomeLinks.upsert(v); }
  listOutcomeLinks(t: string, f: Record<string, unknown> = {}) { return this.s.outcomeLinks.list(t, f); }

  upsertEvaluation(v: InitiativePortfolioEvaluation) { return this.s.evaluations.upsert(v); }
  getEvaluation(t: string, id: string) { return this.s.evaluations.get(t, id); }
  listEvaluations(t: string, f: Record<string, unknown> = {}) { return this.s.evaluations.list(t, f); }

  async deleteTenantAIInitiativePortfolioData(t: string) { await Promise.all(Object.values(this.s).map((x) => x.deleteTenant(t))); }
  async collectionStatus() {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.s)) out[k] = await v.size();
    return out;
  }
}

export const aiInitiativePortfolioRepository = new AIInitiativePortfolioRepository();
