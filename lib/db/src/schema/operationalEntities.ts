import { boolean, index, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const operationalEntitiesTable = pgTable("operational_entities", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  entityType: text("entity_type").notNull(),
  canonicalName: text("canonical_name").notNull(),
  canonicalKey: text("canonical_key").notNull(),
  sourceSystem: text("source_system").notNull(),
  entityConfidenceScore: real("entity_confidence_score").notNull().default(0),
  entityTrustScore: real("entity_trust_score").notNull().default(0),
  isOrphaned: boolean("is_orphaned").notNull().default(false),
  isDuplicateCandidate: boolean("is_duplicate_candidate").notNull().default(false),
  sourceReferences: jsonb("source_references").notNull().default([]),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("operational_entities_tenant_idx").on(t.tenantId), index("operational_entities_entity_type_idx").on(t.entityType), index("operational_entities_canonical_key_idx").on(t.canonicalKey), index("operational_entities_is_orphaned_idx").on(t.isOrphaned)]);
