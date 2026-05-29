import { boolean, index, jsonb, pgTable, real, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const executionOutcomesTable = pgTable('execution_outcomes', {
  id: serial('id').primaryKey(),
  outcomeId: text('outcome_id').notNull(),
  executionResultId: text('execution_result_id').notNull(),
  executionRequestId: text('execution_request_id').notNull(),
  recommendationId: text('recommendation_id'),
  tenantId: text('tenant_id').notNull(),
  verificationState: text('verification_state').notNull().default('PENDING_VERIFICATION'),
  projectedMonthlySavings: real('projected_monthly_savings').notNull().default(0),
  verifiedMonthlySavings: real('verified_monthly_savings').notNull().default(0),
  projectedAnnualSavings: real('projected_annual_savings').notNull().default(0),
  verifiedAnnualSavings: real('verified_annual_savings').notNull().default(0),
  savingsVariance: real('savings_variance').notNull().default(0),
  driftDetected: boolean('drift_detected').notNull().default(false),
  driftReason: text('drift_reason'),
  rollbackAvailable: boolean('rollback_available').notNull().default(false),
  rollbackReference: text('rollback_reference'),
  verificationEvidence: jsonb('verification_evidence').notNull().default({}),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('execution_outcomes_outcome_id_uidx').on(t.outcomeId),
  index('execution_outcomes_tenant_execution_result_idx').on(t.tenantId, t.executionResultId),
]);
