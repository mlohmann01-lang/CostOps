import { boolean, index, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const operationalEntityEdgesTable = pgTable("operational_entity_edges", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  fromEntityId: text("from_entity_id").notNull(),
  toEntityId: text("to_entity_id").notNull(),
  relationshipType: text("relationship_type").notNull(),
  relationshipConfidenceScore: real("relationship_confidence_score").notNull().default(0),
  relationshipTrustScore: real("relationship_trust_score").notNull().default(0),
  sourceSystem: text("source_system").notNull(),
  sourceReferenceId: text("source_reference_id").notNull().default(""),
  edgeProvenance: jsonb("edge_provenance").notNull().default({}),
  edgeMetadata: jsonb("edge_metadata").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("operational_entity_edges_tenant_idx").on(t.tenantId), index("operational_entity_edges_from_idx").on(t.fromEntityId), index("operational_entity_edges_to_idx").on(t.toEntityId), index("operational_entity_edges_relationship_type_idx").on(t.relationshipType), index("operational_entity_edges_is_active_idx").on(t.isActive)]);
