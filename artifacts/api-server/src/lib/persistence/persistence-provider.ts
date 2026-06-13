import { getRuntimeEnv } from "../config/env";

export type PersistenceMode = "MEMORY" | "DATABASE";

export type PersistedRecord = {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt?: string;
};

export interface PersistenceProvider {
  mode: PersistenceMode;
  get<T>(collection: string, tenantId: string, id: string): Promise<T | null>;
  list<T>(collection: string, tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  upsert<T extends PersistedRecord>(collection: string, record: T): Promise<T>;
  delete(collection: string, tenantId: string, id: string): Promise<void>;
  clearTenant(tenantId: string): Promise<void>;
}

export class PersistenceStore<T extends PersistedRecord> {
  private readonly cache = new Map<string, T>();
  private readonly loadedTenants = new Set<string>();

  constructor(
    private readonly provider: PersistenceProvider,
    private readonly collection: string,
  ) {}

  private cacheKey(tenantId: string, id: string) {
    return `${tenantId}:${id}`;
  }

  private async ensureLoaded(tenantId: string): Promise<void> {
    if (this.provider.mode === "MEMORY" || this.loadedTenants.has(tenantId)) return;
    const records = await this.provider.list<T>(this.collection, tenantId);
    for (const r of records) this.cache.set(this.cacheKey(r.tenantId, r.id), r);
    this.loadedTenants.add(tenantId);
  }

  async get(tenantId: string, id: string): Promise<T | null> {
    await this.ensureLoaded(tenantId);
    return this.cache.get(this.cacheKey(tenantId, id)) ?? null;
  }

  async list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]> {
    await this.ensureLoaded(tenantId);
    let results = Array.from(this.cache.values()).filter((r) => r.tenantId === tenantId);
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        results = results.filter((r) => (r as unknown as Record<string, unknown>)[key] === value);
      }
    }
    return results;
  }

  async upsert(record: T): Promise<T> {
    this.cache.set(this.cacheKey(record.tenantId, record.id), record);
    if (this.provider.mode !== "MEMORY") {
      await this.provider.upsert(this.collection, record);
    }
    return record;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.cache.delete(this.cacheKey(tenantId, id));
    if (this.provider.mode !== "MEMORY") {
      await this.provider.delete(this.collection, tenantId, id);
    }
  }

  getCached(tenantId: string, id: string): T | null {
    return this.cache.get(this.cacheKey(tenantId, id)) ?? null;
  }

  listCached(tenantId: string): T[] {
    return Array.from(this.cache.values()).filter((r) => r.tenantId === tenantId);
  }

  setCached(record: T): void {
    this.cache.set(this.cacheKey(record.tenantId, record.id), record);
  }

  clearAll(): void {
    this.cache.clear();
    this.loadedTenants.clear();
  }

  async clearTenant(tenantId: string): Promise<void> {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(`${tenantId}:`)) this.cache.delete(key);
    }
    this.loadedTenants.delete(tenantId);
    if (this.provider.mode !== "MEMORY") {
      await this.provider.clearTenant(tenantId);
    }
  }
}

let _provider: PersistenceProvider | null = null;

export function getPersistenceProvider(): PersistenceProvider {
  if (_provider) return _provider;
  const providerEnv = process.env["PERSISTENCE_PROVIDER"]?.toUpperCase();
  const env = getRuntimeEnv();
  if (providerEnv === "DATABASE" || (env === "production" && providerEnv !== "MEMORY")) {
    const dbUrl = process.env["DATABASE_URL"];
    if (!dbUrl) throw new Error("PERSISTENCE_PROVIDER=database requires DATABASE_URL to be set");
    const { DatabaseProvider } = require("./database-provider");
    _provider = new DatabaseProvider(dbUrl);
  } else {
    const { MemoryProvider } = require("./memory-provider");
    _provider = new MemoryProvider();
  }
  return _provider!;
}

export function setPersistenceProvider(provider: PersistenceProvider): void {
  _provider = provider;
}

export function resetPersistenceProvider(): void {
  _provider = null;
}
