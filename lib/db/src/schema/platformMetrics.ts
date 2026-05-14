import { pgTable, serial, text, timestamp, jsonb, real } from "drizzle-orm/pg-core";
export const platformMetricsTable = pgTable("platform_metrics", {
  id: serial("id").primaryKey(),
  metricType: text("metric_type").notNull(),
  tenantId: text("tenant_id"),
  source: text("source").notNull(),
  value: real("value").notNull(),
  dimensions: jsonb("dimensions").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
