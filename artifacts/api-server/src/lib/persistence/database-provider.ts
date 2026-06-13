import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import type { PersistenceProvider, PersistedRecord } from "./persistence-provider";

// pg is an optional prod dependency — lazy require avoids startup errors in dev/test
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPool(connectionString: string): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // String concat prevents esbuild from statically analyzing and bundling this require
  const { Pool } = require(`p${"g"}`);
  return new Pool({ connectionString });
}

export class DatabaseProvider implements PersistenceProvider {
  readonly mode = "DATABASE" as const;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly pool: any;
  private migrated = false;

  constructor(connectionString: string) {
    this.pool = getPool(connectionString);
  }

  private async ensureMigrated(): Promise<void> {
    if (this.migrated) return;
    const migrationPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "migrations",
      "001_certen_persisted_records.sql",
    );
    const sql = readFileSync(migrationPath, "utf8");
    await this.pool.query(sql);
    this.migrated = true;
  }

  async get<T>(collection: string, tenantId: string, id: string): Promise<T | null> {
    await this.ensureMigrated();
    const result = await this.pool.query(
      "select record from certen_persisted_records where tenant_id=$1 and collection=$2 and id=$3",
      [tenantId, collection, id],
    );
    return result.rows[0]?.record as T ?? null;
  }

  async list<T>(collection: string, tenantId: string, filters?: Record<string, unknown>): Promise<T[]> {
    await this.ensureMigrated();
    const result = await this.pool.query(
      "select record from certen_persisted_records where tenant_id=$1 and collection=$2 order by updated_at asc",
      [tenantId, collection],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records = result.rows.map((row: any) => row.record as T);
    if (filters) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      records = records.filter((r: any) => {
        for (const [key, value] of Object.entries(filters)) {
          if ((r as unknown as Record<string, unknown>)[key] !== value) return false;
        }
        return true;
      });
    }
    return records;
  }

  async upsert<T extends PersistedRecord>(collection: string, record: T): Promise<T> {
    await this.ensureMigrated();
    const now = new Date();
    await this.pool.query(
      `insert into certen_persisted_records (id, tenant_id, collection, record, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (tenant_id, collection, id) do update
       set record = $4, updated_at = $6`,
      [record.id, record.tenantId, collection, JSON.stringify(record), now, now],
    );
    return record;
  }

  async delete(collection: string, tenantId: string, id: string): Promise<void> {
    await this.ensureMigrated();
    await this.pool.query(
      "delete from certen_persisted_records where tenant_id=$1 and collection=$2 and id=$3",
      [tenantId, collection, id],
    );
  }

  async clearTenant(tenantId: string): Promise<void> {
    await this.ensureMigrated();
    await this.pool.query("delete from certen_persisted_records where tenant_id=$1", [tenantId]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
