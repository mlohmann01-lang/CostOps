import crypto from "node:crypto";
import { db, evidenceItemsTable, evidenceLinksTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, val]) => [k, stable(val)])) : v;
export class EvidenceRegistryV2Service {
  constructor(private readonly store = db) {}
  hashEvidencePayload(payload: unknown) { return crypto.createHash("sha256").update(JSON.stringify(stable(payload))).digest("hex"); }
  summarizeEvidence(payload: unknown) { const s = JSON.stringify(stable(payload)); return s.length > 240 ? `${s.slice(0, 237)}...` : s; }
  async createEvidenceItem(input: { tenantId: string; evidenceType: string; sourceSystem?: string | null; sourceEntityType?: string | null; sourceEntityId?: string | null; collectedAt?: Date; collectedByPrincipalId?: string | null; trustScore?: string | number | null; hash?: string; summary?: string | null; payload?: unknown }) {
    const payload = input.payload ?? {};
    const [row] = await this.store.insert(evidenceItemsTable).values({ id: id("evidence"), tenantId: input.tenantId, evidenceType: input.evidenceType, sourceSystem: input.sourceSystem ?? null, sourceEntityType: input.sourceEntityType ?? null, sourceEntityId: input.sourceEntityId ?? null, collectedAt: input.collectedAt ?? new Date(), collectedByPrincipalId: input.collectedByPrincipalId ?? null, trustScore: input.trustScore == null ? null : String(input.trustScore), hash: input.hash ?? this.hashEvidencePayload(payload), summary: input.summary ?? this.summarizeEvidence(payload), payload: payload as any }).returning();
    return row;
  }
  async linkEvidenceToEntity(input: { tenantId: string; evidenceItemId: string; linkedEntityType: string; linkedEntityId: string; relationshipType: string }) {
    const [row] = await this.store.insert(evidenceLinksTable).values({ id: id("evlink"), ...input }).returning();
    return row;
  }
  async getEvidenceForEntity(tenantId: string, linkedEntityType: string, linkedEntityId: string) {
    const links = await this.store.select().from(evidenceLinksTable).where(and(eq(evidenceLinksTable.tenantId, tenantId), eq(evidenceLinksTable.linkedEntityType, linkedEntityType), eq(evidenceLinksTable.linkedEntityId, linkedEntityId)));
    const out = [] as any[]; for (const link of links) { const [item] = await this.store.select().from(evidenceItemsTable).where(and(eq(evidenceItemsTable.tenantId, tenantId), eq(evidenceItemsTable.id, link.evidenceItemId))).limit(1); if (item) out.push({ ...item, link }); } return out;
  }
  async getEvidenceTimeline(tenantId: string, linkedEntityType: string, linkedEntityId: string) { return (await this.getEvidenceForEntity(tenantId, linkedEntityType, linkedEntityId)).sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()); }
  listEvidence(tenantId: string) { return this.store.select().from(evidenceItemsTable).where(eq(evidenceItemsTable.tenantId, tenantId)); }
  getEvidence(tenantId: string, id: string) { return this.store.select().from(evidenceItemsTable).where(and(eq(evidenceItemsTable.tenantId, tenantId), eq(evidenceItemsTable.id, id))).limit(1).then((r) => r[0] ?? null); }
}
