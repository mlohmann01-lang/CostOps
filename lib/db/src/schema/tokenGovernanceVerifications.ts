import { pgTable, serial, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";

export const tokenGovernanceVerificationEventsTable = pgTable("token_governance_verification_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  verificationId: text("verification_id").notNull().unique(),
  executionId: text("execution_id"),
  fromModel: text("from_model"),
  toModel: text("to_model"),
  baselineTokens: numeric("baseline_tokens", { precision: 18, scale: 0 }),
  baselineCost: numeric("baseline_cost", { precision: 12, scale: 4 }),
  measuredTokens: numeric("measured_tokens", { precision: 18, scale: 0 }),
  measuredCost: numeric("measured_cost", { precision: 12, scale: 4 }),
  realizedSavings: numeric("realized_savings", { precision: 12, scale: 4 }),
  realizedSavingsPercent: numeric("realized_savings_percent", { precision: 8, scale: 4 }),
  status: text("status").notNull().default("PENDING"),
  confidenceLevel: text("confidence_level").notNull().default("LOW"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  proofGraphNodeId: text("proof_graph_node_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  metadataJson: jsonb("metadata_json").notNull().default({}),
});

export type InsertTokenGovernanceVerification = typeof tokenGovernanceVerificationEventsTable.$inferInsert;
export type TokenGovernanceVerification = typeof tokenGovernanceVerificationEventsTable.$inferSelect;
