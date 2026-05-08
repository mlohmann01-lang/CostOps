import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const driftEventsTable = pgTable("drift_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  recommendationId: text("recommendation_id").notNull(),
  outcomeLedgerId: integer("outcome_ledger_id").notNull(),
  userPrincipalName: text("user_principal_name").notNull(),
  action: text("action").notNull(),
  driftType: text("drift_type").notNull(),
  driftStatus: text("drift_status").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDriftEventSchema = createInsertSchema(driftEventsTable).omit({ id: true, createdAt: true });
export type InsertDriftEvent = z.infer<typeof insertDriftEventSchema>;
export type DriftEvent = typeof driftEventsTable.$inferSelect;
