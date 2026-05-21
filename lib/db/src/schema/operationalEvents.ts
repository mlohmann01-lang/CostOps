import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const econOpsEventsTable = pgTable("econ_ops_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("INFO"),
  source: text("source").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  dedupeKey: text("dedupe_key"),
  payloadJson: jsonb("payload_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  status: text("status").notNull().default("PENDING"),
});
