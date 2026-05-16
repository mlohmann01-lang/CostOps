import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suppressedRecommendationsTable = pgTable("suppressed_recommendations", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  playbookId: text("playbook_id").notNull(),
  targetEntityId: text("target_entity_id").notNull(),
  reasonCode: text("reason_code").notNull(),
  reasonText: text("reason_text").notNull().default(""),
  evidenceSnapshot: jsonb("evidence_snapshot").notNull().default({}),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSuppressedRecommendationSchema = createInsertSchema(suppressedRecommendationsTable).omit({ id: true, createdAt: true });
export type InsertSuppressedRecommendation = z.infer<typeof insertSuppressedRecommendationSchema>;
export type SuppressedRecommendation = typeof suppressedRecommendationsTable.$inferSelect;
