import { and, eq } from "drizzle-orm";
import { db, operationalEntitiesTable, operationalEntityEdgesTable } from "@workspace/db";

export function shouldPreserveTrustedLifecycle(existingLifecycle: string, incomingLifecycle: string): boolean {
  return existingLifecycle === "TRUSTED" && incomingLifecycle !== "STALE" && incomingLifecycle !== "CONFLICTED";
}

export class OperationalGraphRepository {
  async createNode(input: typeof operationalEntitiesTable.$inferInsert) {
    const existing = await this.findNodeByKey(input.tenantId, input.canonicalKey);
    if (existing) {
      const existingRefs = (existing.sourceReferences as unknown[] ?? []);
      const incomingRefs = (input.sourceReferences as unknown[] ?? []);
      const mergedReferences = Array.from(new Set([...existingRefs, ...incomingRefs].map((v) => JSON.stringify(v)))).map((v) => JSON.parse(v) as unknown);
      const existingMeta = (existing.metadata as Record<string, unknown>) ?? {};
      const incomingMeta = (input.metadata as Record<string, unknown>) ?? {};
      const existingConfidence = Number(existing.entityConfidenceScore ?? 0);
      const incomingConfidence = Number(input.entityConfidenceScore ?? 0);
      const existingLifecycle = String(existingMeta.lifecycleState ?? "DISCOVERED");
      const incomingLifecycle = String(incomingMeta.lifecycleState ?? "DISCOVERED");
      const preserveTrusted = shouldPreserveTrustedLifecycle(existingLifecycle, incomingLifecycle);
      const finalConfidence = preserveTrusted ? Math.max(existingConfidence, incomingConfidence) : Math.max(existingConfidence, incomingConfidence);
      const [row] = await db
        .update(operationalEntitiesTable)
        .set({
          ...input,
          entityConfidenceScore: finalConfidence,
          sourceReferences: mergedReferences,
          metadata: {
            ...existingMeta,
            ...incomingMeta,
            firstSeenAt: existingMeta.firstSeenAt ?? incomingMeta.firstSeenAt ?? existing.createdAt?.toISOString?.(),
            lastSeenAt: incomingMeta.lastSeenAt ?? new Date().toISOString(),
            lifecycleState: preserveTrusted ? "TRUSTED" : incomingLifecycle,
            mergeReason: "CANONICAL_KEY_MERGE",
            evidencePointers: [...(((existingMeta.evidencePointers as unknown[]) ?? [])), ...(((incomingMeta.evidencePointers as unknown[]) ?? []))],
            updatedAt: new Date().toISOString(),
          },
        })
        .where(eq(operationalEntitiesTable.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db.insert(operationalEntitiesTable).values(input).returning();
    return row;
  }
  async createEdge(input: typeof operationalEntityEdgesTable.$inferInsert) {
    const existing = await db.select().from(operationalEntityEdgesTable).where(
      and(
        eq(operationalEntityEdgesTable.tenantId, input.tenantId),
        eq(operationalEntityEdgesTable.fromEntityId, input.fromEntityId),
        eq(operationalEntityEdgesTable.toEntityId, input.toEntityId),
        eq(operationalEntityEdgesTable.relationshipType, input.relationshipType),
      ),
    ).limit(1);
    if (existing[0]) return existing[0];
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
