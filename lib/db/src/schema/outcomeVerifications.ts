import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outcomeVerificationsTable = pgTable("outcome_verifications", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  outcomeLedgerId: integer("outcome_ledger_id").notNull(),
  recommendationId: text("recommendation_id").notNull(),
  verificationStatus: text("verification_status").notNull(),
  verificationConfidence: text("verification_confidence").notNull(),
  verificationSource: text("verification_source").notNull(),
  projectedMonthlySaving: real("projected_monthly_saving").notNull(),
  verifiedMonthlySaving: real("verified_monthly_saving"),
  varianceAmount: real("variance_amount"),
  variancePct: real("variance_pct"),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOutcomeVerificationSchema = createInsertSchema(outcomeVerificationsTable).omit({ id: true, createdAt: true });
export type InsertOutcomeVerification = z.infer<typeof insertOutcomeVerificationSchema>;
export type OutcomeVerification = typeof outcomeVerificationsTable.$inferSelect;
