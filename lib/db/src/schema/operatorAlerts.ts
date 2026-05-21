import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const operatorAlertsTable = pgTable("operator_alerts", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  severity: text("severity").notNull().default("INFO"),
  category: text("category").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  recommendedAction: text("recommended_action"),
  status: text("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: text("acknowledged_by"),
  metadataJson: jsonb("metadata_json").notNull().default({}),
});
