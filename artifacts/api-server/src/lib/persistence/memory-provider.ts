import type { PersistenceProvider, PersistedRecord } from "./persistence-provider";

export class MemoryProvider implements PersistenceProvider {
  readonly mode = "MEMORY" as const;
  private readonly store = new Map<string, Map<string, unknown>>();

  private collectionKey(collection: string, tenantId: string) {
    return `${collection}:${tenantId}`;
  }

  private getCollection(collection: string, tenantId: string): Map<string, unknown> {
    const key = this.collectionKey(collection, tenantId);
    if (!this.store.has(key)) this.store.set(key, new Map());
    return this.store.get(key)!;
  }

  async get<T>(collection: string, tenantId: string, id: string): Promise<T | null> {
    return (this.getCollection(collection, tenantId).get(id) as T) ?? null;
  }

  async list<T>(collection: string, tenantId: string, filters?: Record<string, unknown>): Promise<T[]> {
    const results = Array.from(this.getCollection(collection, tenantId).values()) as T[];
    if (!filters) return results;
    return results.filter((r) => {
      for (const [key, value] of Object.entries(filters)) {
        if ((r as unknown as Record<string, unknown>)[key] !== value) return false;
      }
      return true;
    });
  }

  async upsert<T extends PersistedRecord>(collection: string, record: T): Promise<T> {
    this.getCollection(collection, record.tenantId).set(record.id, record);
    return record;
  }

  async delete(collection: string, tenantId: string, id: string): Promise<void> {
    this.getCollection(collection, tenantId).delete(id);
  }

  async clearTenant(tenantId: string): Promise<void> {
    for (const key of Array.from(this.store.keys())) {
      if (key.endsWith(`:${tenantId}`)) this.store.delete(key);
    }
  }

  clearAll(): void {
    this.store.clear();
  }
}
