import type { AICapitalAllocationCollection } from './ai-capital-allocation-types';

interface Keyed { id: string; tenantId: string }
interface Store<T extends Keyed> {
  upsert(v: T): Promise<T>;
  get(tenantId: string, id: string): Promise<T | undefined>;
  list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  deleteTenant(tenantId: string): Promise<void>;
  size(): Promise<number>;
}

const matches = (v: Record<string, unknown>, f: Record<string, unknown>) =>
  Object.entries(f).every(([k, val]) => val === undefined || val === '' || v[k] === val);

export class MemoryPersistenceStore<T extends Keyed> implements Store<T> {
  private rows = new Map<string, T>();
  constructor(readonly collection: AICapitalAllocationCollection) {}
  private key(t: string, id: string) { return `${t}:${id}`; }
  async upsert(v: T) { this.rows.set(this.key(v.tenantId, v.id), v); return v; }
  async get(t: string, id: string) { return this.rows.get(this.key(t, id)); }
  async list(t: string, f: Record<string, unknown> = {}) { return [...this.rows.values()].filter((v) => v.tenantId === t && matches(v as any, f)); }
  async deleteTenant(t: string) { for (const v of this.rows.values()) if (v.tenantId === t) this.rows.delete(this.key(t, v.id)); }
  async size() { return this.rows.size; }
}

export class DatabasePersistenceStore<T extends Keyed> implements Store<T> {
  constructor(readonly collection: AICapitalAllocationCollection) {}
  private pk(v: { tenantId: string; id: string }) { return `${v.tenantId}:${this.collection}:${v.id}`; }
  private async db() { return import('@workspace/db'); }
  async upsert(v: T) {
    const { db, aiCapitalAllocationRecordsTable } = await this.db();
    await db.insert(aiCapitalAllocationRecordsTable).values({ id: this.pk(v), tenantId: v.tenantId, collection: this.collection, recordId: v.id, payload: v as any })
      .onConflictDoUpdate({ target: aiCapitalAllocationRecordsTable.id, set: { payload: v as any, updatedAt: new Date() } });
    return v;
  }
  async get(t: string, id: string) {
    const { db, aiCapitalAllocationRecordsTable } = await this.db();
    const { and, eq } = await import('drizzle-orm');
    const rows = await db.select().from(aiCapitalAllocationRecordsTable).where(and(eq(aiCapitalAllocationRecordsTable.tenantId, t), eq(aiCapitalAllocationRecordsTable.collection, this.collection), eq(aiCapitalAllocationRecordsTable.recordId, id))).limit(1);
    return rows[0]?.payload as T | undefined;
  }
  async list(t: string, f: Record<string, unknown> = {}) {
    const { db, aiCapitalAllocationRecordsTable } = await this.db();
    const { and, eq } = await import('drizzle-orm');
    const rows = await db.select().from(aiCapitalAllocationRecordsTable).where(and(eq(aiCapitalAllocationRecordsTable.tenantId, t), eq(aiCapitalAllocationRecordsTable.collection, this.collection)));
    return rows.map((r) => r.payload as T).filter((v) => matches(v as any, f));
  }
  async deleteTenant(t: string) {
    const { db, aiCapitalAllocationRecordsTable } = await this.db();
    const { and, eq } = await import('drizzle-orm');
    await db.delete(aiCapitalAllocationRecordsTable).where(and(eq(aiCapitalAllocationRecordsTable.tenantId, t), eq(aiCapitalAllocationRecordsTable.collection, this.collection)));
  }
  async size() {
    const { db, aiCapitalAllocationRecordsTable } = await this.db();
    const { eq } = await import('drizzle-orm');
    return (await db.select().from(aiCapitalAllocationRecordsTable).where(eq(aiCapitalAllocationRecordsTable.collection, this.collection))).length;
  }
}

export function createPersistenceStore<T extends Keyed>(collection: AICapitalAllocationCollection): Store<T> {
  return process.env.DATABASE_URL ? new DatabasePersistenceStore<T>(collection) : new MemoryPersistenceStore<T>(collection);
}
