import { pgTable, serial, text, real, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outcomeLedgerTable = pgTable("outcome_ledger", {
  id: serial("id").primaryKey(),

  tenantId: text("tenant_id").notNull().default("default"),

  recommendationId: integer("recommendation_id").notNull(),

  userEmail: text("user_email").notNull(),
  displayName: text("display_name").notNull(),
  action: text("action").notNull(),
  licenceSku: text("licence_sku").notNull(),

  beforeCost: real("before_cost").notNull().default(0),
  afterCost: real("after_cost").notNull().default(0),
  monthlySaving: real("monthly_saving").notNull(),
  annualisedSaving: real("annualised_saving").notNull(),

  approved: boolean("approved").notNull().default(false),
  executed: boolean("executed").notNull().default(false),
  executionMode: text("execution_mode").notNull().default("SIMULATED"),

  playbookId: text("playbook_id").notNull().default(""),
  playbookName: text("playbook_name").notNull().default(""),

  actionRiskProfile: jsonb("action_risk_profile").notNull().default({}),
  trustSnapshot: jsonb("trust_snapshot").notNull().default({}),
  beforeState: jsonb("before_state").notNull().default({}),
  afterState: jsonb("after_state").notNull().default({}),
  dryRunResult: jsonb("dry_run_result").notNull().default({}),
  executionEvidence: jsonb("execution_evidence").notNull().default({}),

  evidence: jsonb("evidence").notNull().default({}),

  pricingSnapshot: jsonb("pricing_snapshot").notNull().default({}),
  pricingConfidence: text("pricing_confidence").notNull().default("UNKNOWN"),
  pricingSource: text("pricing_source").notNull().default(""),
  savingConfidence: text("saving_confidence").notNull().default("ESTIMATED"),

  actorId: text("actor_id").notNull().default("system"),
  executionStatus: text("execution_status").notNull().default("EXECUTED"),

  idempotencyKey: text("idempotency_key"),

  approvedAt: timestamp("approved_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOutcomeLedgerSchema = createInsertSchema(outcomeLedgerTable).omit({ id: true, createdAt: true });
export type InsertOutcomeLedger = z.infer<typeof insertOutcomeLedgerSchema>;
export type OutcomeLedger = typeof outcomeLedgerTable.$inferSelect;
