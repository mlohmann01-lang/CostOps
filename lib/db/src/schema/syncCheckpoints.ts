import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const syncCheckpointsTable = pgTable("sync_checkpoints", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  connectorId: text("connector_id").notNull(),
  syncType: text("sync_type").notNull(),
  checkpointKey: text("checkpoint_key").notNull(),
  cursor: text("cursor"),
  processedCount: integer("processed_count").notNull().default(0),
  totalEstimate: integer("total_estimate"),
  status: text("status").notNull().default("IN_PROGRESS"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  metadataJson: jsonb("metadata_json").notNull().default({}),
});
