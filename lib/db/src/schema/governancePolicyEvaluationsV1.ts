import { index, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const governancePolicyEvaluationsV1Table = pgTable('governance_policy_evaluations_v1', {
  id: serial('id').primaryKey(),
  evaluationId: text('evaluation_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  policyName: text('policy_name').notNull(),
  evaluationResult: text('evaluation_result').notNull(),
  evaluationReason: text('evaluation_reason').notNull(),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull(),
  triggeredBy: text('triggered_by').notNull(),
  evidenceSnapshot: jsonb('evidence_snapshot').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('gpe_v1_tenant_idx').on(t.tenantId),
  index('gpe_v1_entity_idx').on(t.entityType, t.entityId),
  index('gpe_v1_policy_idx').on(t.policyName),
]);
