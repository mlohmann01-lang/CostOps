import { index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const executionResultsTable = pgTable("execution_results", {
  id: serial("id").primaryKey(),
  executionResultId: text("execution_result_id").notNull(),
  tenantId: text("tenant_id").notNull(),
  executionRequestId: text("execution_request_id").notNull(),
  executionState: text("execution_state").notNull(),
  executedActions: jsonb("executed_actions").notNull().default([]),
  executionEvidence: jsonb("execution_evidence").notNull().default([]),
  rollbackReference: text("rollback_reference").notNull(),
  executionWarnings: jsonb("execution_warnings").notNull().default([]),
  executionErrors: jsonb("execution_errors").notNull().default([]),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  executedBy: text("executed_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("execution_results_execution_result_id_uidx").on(t.executionResultId),
  uniqueIndex("execution_results_request_id_uidx").on(t.executionRequestId),
  index("execution_results_tenant_idx").on(t.tenantId),
]);
