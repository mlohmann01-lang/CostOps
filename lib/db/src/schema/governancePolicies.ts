import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const governancePoliciesTable = pgTable("governance_policies", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  policyType: text("policy_type").notNull(),
  name: text("name").notNull(),
  enabled: text("enabled").notNull().default("true"),
  conditions: jsonb("conditions").notNull().default({}),
  actions: jsonb("actions").notNull().default({}),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const policyEvaluationsTable = pgTable("policy_evaluations", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  policyId: integer("policy_id"),
  recommendationId: text("recommendation_id"),
  outcomeLedgerId: integer("outcome_ledger_id"),
  actorId: text("actor_id"),
  decision: text("decision").notNull(),
  reasons: jsonb("reasons").notNull().default([]),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
