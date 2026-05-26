import { and, eq } from "drizzle-orm";
import { db, operationalEntitiesTable, operationalEntityEdgesTable } from "@workspace/db";

export class OperationalGraphRepository {
  async createNode(input: typeof operationalEntitiesTable.$inferInsert) {
    const [row] = await db.insert(operationalEntitiesTable).values(input).returning();
    return row;
  }
  async createEdge(input: typeof operationalEntityEdgesTable.$inferInsert) {
    const [row] = await db.insert(operationalEntityEdgesTable).values(input).returning();
    return row;
  }
  async listNodes(tenantId: string) { return db.select().from(operationalEntitiesTable).where(eq(operationalEntitiesTable.tenantId, tenantId)); }
  async listEdges(tenantId: string) { return db.select().from(operationalEntityEdgesTable).where(eq(operationalEntityEdgesTable.tenantId, tenantId)); }
  async findNodeByKey(tenantId: string, canonicalKey: string) {
    const rows = await db.select().from(operationalEntitiesTable).where(and(eq(operationalEntitiesTable.tenantId, tenantId), eq(operationalEntitiesTable.canonicalKey, canonicalKey))).limit(1);
    return rows[0] ?? null;
  }
}
