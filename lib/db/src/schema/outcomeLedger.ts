import { pgTable, serial, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outcomeLedgerTable = pgTable("outcome_ledger", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  recommendationId: integer("recommendation_id").notNull(),
  playbookId: text("playbook_id").notNull().default(""),
  playbookName: text("playbook_name").notNull().default(""),
  action: text("action").notNull(),
  actionRiskProfile: jsonb("action_risk_profile").notNull().default({}),
  trustSnapshot: jsonb("trust_snapshot").notNull().default({}),
  beforeState: jsonb("before_state").notNull().default({}),
  afterState: jsonb("after_state").notNull().default({}),
  dryRunResult: jsonb("dry_run_result").notNull().default({}),
  executionEvidence: jsonb("execution_evidence").notNull().default({}),
  monthlySaving: real("monthly_saving").notNull(),
  annualisedSaving: real("annualised_saving").notNull(),
  savingConfidence: text("saving_confidence").notNull().default("ESTIMATED"),
  actorId: text("actor_id").notNull().default("system"),
  executionMode: text("execution_mode").notNull().default("MANUAL_APPROVAL_REQUIRED"),
  executionStatus: text("execution_status").notNull().default("EXECUTED"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOutcomeLedgerSchema = createInsertSchema(outcomeLedgerTable).omit({ id: true, createdAt: true });
export type InsertOutcomeLedger = z.infer<typeof insertOutcomeLedgerSchema>;
export type OutcomeLedger = typeof outcomeLedgerTable.$inferSelect;
