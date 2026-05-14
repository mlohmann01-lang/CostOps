import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const platformEventsTable = pgTable("platform_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id"),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull(),
  source: text("source").notNull(),
  correlationId: text("correlation_id").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  message: text("message").notNull(),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
