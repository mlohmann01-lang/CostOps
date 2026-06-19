import { createPersistenceStore, MemoryPersistenceStore } from './value-realisation-persistence';
import type {
  BusinessCapability, Investment, InvestmentAsset, InvestmentCapability, InvestmentDecision,
  PersistenceStore, ValueAttribution, ValueSignal,
} from './value-realisation-types';

export interface ValueRealisationStores {
  investments: PersistenceStore<Investment>;
  capabilities: PersistenceStore<BusinessCapability>;
  investmentCapabilities: PersistenceStore<InvestmentCapability>;
  investmentAssets: PersistenceStore<InvestmentAsset>;
  investmentDecisions: PersistenceStore<InvestmentDecision>;
  signals: PersistenceStore<ValueSignal>;
  attributions: PersistenceStore<ValueAttribution>;
}

export const createValueRealisationStores = (): ValueRealisationStores => ({
  investments: createPersistenceStore('INVESTMENTS'),
  capabilities: createPersistenceStore('BUSINESS_CAPABILITIES'),
  investmentCapabilities: createPersistenceStore('INVESTMENT_CAPABILITIES'),
  investmentAssets: createPersistenceStore('INVESTMENT_ASSETS'),
  investmentDecisions: createPersistenceStore('INVESTMENT_DECISIONS'),
  signals: createPersistenceStore('VALUE_SIGNALS'),
  attributions: createPersistenceStore('VALUE_ATTRIBUTIONS'),
});

export const createInMemoryValueRealisationStores = (): ValueRealisationStores => ({
  investments: new MemoryPersistenceStore('INVESTMENTS'),
  capabilities: new MemoryPersistenceStore('BUSINESS_CAPABILITIES'),
  investmentCapabilities: new MemoryPersistenceStore('INVESTMENT_CAPABILITIES'),
  investmentAssets: new MemoryPersistenceStore('INVESTMENT_ASSETS'),
  investmentDecisions: new MemoryPersistenceStore('INVESTMENT_DECISIONS'),
  signals: new MemoryPersistenceStore('VALUE_SIGNALS'),
  attributions: new MemoryPersistenceStore('VALUE_ATTRIBUTIONS'),
});

export class ValueRealisationRepository {
  constructor(private readonly s: ValueRealisationStores = createValueRealisationStores()) {}

  upsertInvestment(v: Investment) { return this.s.investments.upsert(v); }
  getInvestment(t: string, id: string) { return this.s.investments.get(t, id); }
  listInvestments(t: string, f: Record<string, unknown> = {}) { return this.s.investments.list(t, f); }

  upsertCapability(v: BusinessCapability) { return this.s.capabilities.upsert(v); }
  getCapability(t: string, id: string) { return this.s.capabilities.get(t, id); }
  listCapabilities(t: string, f: Record<string, unknown> = {}) { return this.s.capabilities.list(t, f); }

  upsertInvestmentCapability(v: InvestmentCapability) { return this.s.investmentCapabilities.upsert(v); }
  listInvestmentCapabilities(t: string, f: Record<string, unknown> = {}) { return this.s.investmentCapabilities.list(t, f); }

  upsertInvestmentAsset(v: InvestmentAsset) { return this.s.investmentAssets.upsert(v); }
  listInvestmentAssets(t: string, f: Record<string, unknown> = {}) { return this.s.investmentAssets.list(t, f); }

  upsertInvestmentDecision(v: InvestmentDecision) { return this.s.investmentDecisions.upsert(v); }
  listInvestmentDecisions(t: string, f: Record<string, unknown> = {}) { return this.s.investmentDecisions.list(t, f); }

  upsertSignal(v: ValueSignal) { return this.s.signals.upsert(v); }
  getSignal(t: string, id: string) { return this.s.signals.get(t, id); }
  listSignals(t: string, f: Record<string, unknown> = {}) { return this.s.signals.list(t, f); }

  upsertAttribution(v: ValueAttribution) { return this.s.attributions.upsert(v); }
  listAttributions(t: string, f: Record<string, unknown> = {}) { return this.s.attributions.list(t, f); }

  async deleteTenantValueRealisationData(t: string) { await Promise.all(Object.values(this.s).map((x) => x.deleteTenant(t))); }
  async collectionStatus() {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.s)) out[k] = await v.size();
    return out;
  }
}

export const valueRealisationRepository = new ValueRealisationRepository();
