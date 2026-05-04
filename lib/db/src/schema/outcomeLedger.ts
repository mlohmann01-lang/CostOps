import { pgTable, serial, text, real, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outcomeLedgerTable = pgTable("outcome_ledger", {
  id: serial("id").primaryKey(),
  recommendationId: integer("recommendation_id").notNull(),
  userEmail: text("user_email").notNull(),
  displayName: text("display_name").notNull(),
  action: text("action").notNull(),
  licenceSku: text("licence_sku").notNull(),
  beforeCost: real("before_cost").notNull(),
  afterCost: real("after_cost").notNull(),
  monthlySaving: real("monthly_saving").notNull(),
  annualisedSaving: real("annualised_saving").notNull(),
  approved: boolean("approved").notNull().default(false),
  executed: boolean("executed").notNull().default(false),
  executionMode: text("execution_mode").notNull().default("MANUAL_APPROVAL_REQUIRED"),
  evidence: jsonb("evidence").notNull().default({}),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOutcomeLedgerSchema = createInsertSchema(outcomeLedgerTable).omit({ id: true, createdAt: true });
export type InsertOutcomeLedger = z.infer<typeof insertOutcomeLedgerSchema>;
export type OutcomeLedger = typeof outcomeLedgerTable.$inferSelect;
