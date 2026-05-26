import { index, jsonb, pgTable, serial, text, timestamp, uniqueIndex, boolean, real } from "drizzle-orm/pg-core";

export const executionRequestDryRunsTable = pgTable("execution_request_dry_runs", {
  id: serial("id").primaryKey(),
  simulationId: text("simulation_id").notNull(),
  tenantId: text("tenant_id").notNull(),
  executionRequestId: text("execution_request_id").notNull(),
  simulationState: text("simulation_state").notNull(),
  simulatedActions: jsonb("simulated_actions").notNull().default([]),
  impactedEntities: jsonb("impacted_entities").notNull().default([]),
  projectedSavingsValidated: real("projected_savings_validated").notNull().default(0),
  validationWarnings: jsonb("validation_warnings").notNull().default([]),
  validationErrors: jsonb("validation_errors").notNull().default([]),
  rollbackPlan: jsonb("rollback_plan").notNull().default({}),
  rollbackSupported: boolean("rollback_supported").notNull().default(false),
  policyBlocks: jsonb("policy_blocks").notNull().default([]),
  preflightResults: jsonb("preflight_results").notNull().default([]),
  simulatedAt: timestamp("simulated_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("execution_request_dry_runs_simulation_id_uidx").on(t.simulationId),
  index("execution_request_dry_runs_tenant_idx").on(t.tenantId),
  index("execution_request_dry_runs_req_idx").on(t.executionRequestId),
]);
