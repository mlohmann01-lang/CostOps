import { pgTable, serial, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";

export const economicOperationsActionHistoryTable = pgTable("economic_operations_action_history", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  executionId: text("execution_id").notNull(),
  recommendationId: text("recommendation_id").notNull(),
  intentType: text("intent_type").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  sourceSurface: text("source_surface").notNull(),
  resultState: text("result_state").notNull(),
  previousState: text("previous_state").notNull(),
  nextState: text("next_state").notNull(),
  reason: text("reason").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  proofIds: jsonb("proof_ids").notNull().default([]),
  ledgerEntryId: text("ledger_entry_id"),
  metadataJson: jsonb("metadata_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const economicOperationsExecutionStateTable = pgTable("economic_operations_execution_state", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), executionId: text("execution_id").notNull(), recommendationId: text("recommendation_id").notNull(), provider: text("provider").notNull(), playbookId: text("playbook_id").notNull(), currentState: text("current_state").notNull(), previousState: text("previous_state").notNull(), approvalStatus: text("approval_status").notNull(), simulationStatus: text("simulation_status").notNull(), executionStatus: text("execution_status").notNull(), verificationStatus: text("verification_status").notNull(), rollbackStatus: text("rollback_status").notNull(), driftStatus: text("drift_status").notNull(), lastIntentType: text("last_intent_type"), lastStateTransitionAt: timestamp("last_state_transition_at", { withTimezone: true }).notNull().defaultNow(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()), metadataJson: jsonb("metadata_json").notNull().default({})
}, (t) => [unique("econ_ops_execution_state_tenant_exec_unique").on(t.tenantId, t.executionId)]);

export const economicOperationsIdempotencyTable = pgTable("economic_operations_idempotency", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), executionId: text("execution_id").notNull(), intentType: text("intent_type").notNull(), idempotencyKey: text("idempotency_key").notNull(), resultState: text("result_state").notNull(), resultHash: text("result_hash").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), expiresAt: timestamp("expires_at", { withTimezone: true }), metadataJson: jsonb("metadata_json").notNull().default({})
}, (t) => [unique("econ_ops_idempotency_unique").on(t.tenantId, t.executionId, t.intentType, t.idempotencyKey)]);

export const economicOperationsVerificationEventsTable = pgTable("economic_operations_verification_events", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), executionId: text("execution_id").notNull(), recommendationId: text("recommendation_id").notNull(), verificationStatus: text("verification_status").notNull(), verificationReason: text("verification_reason"), evidenceHash: text("evidence_hash").notNull(), sourceOfTruth: text("source_of_truth").notNull(), currentAssignedSkuIds: jsonb("current_assigned_sku_ids").notNull().default([]), removedSkuIds: jsonb("removed_sku_ids").notNull().default([]), accountEnabled: text("account_enabled"), evidenceFreshness: text("evidence_freshness"), verifiedSaving: text("verified_saving"), verifiedAt: timestamp("verified_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), metadataJson: jsonb("metadata_json").notNull().default({})
});

export const economicOperationsDriftEventsTable = pgTable("economic_operations_drift_events", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), executionId: text("execution_id").notNull(), recommendationId: text("recommendation_id").notNull(), outcomeLedgerId: text("outcome_ledger_id"), driftStatus: text("drift_status").notNull(), driftType: text("drift_type").notNull(), severity: text("severity").notNull(), reason: text("reason"), evidenceHash: text("evidence_hash").notNull(), detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(), acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }), acknowledgedBy: text("acknowledged_by"), metadataJson: jsonb("metadata_json").notNull().default({})
});

export const economicOperationsRollbackEventsTable = pgTable("economic_operations_rollback_events", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), executionId: text("execution_id").notNull(), recommendationId: text("recommendation_id").notNull(), rollbackReadinessState: text("rollback_readiness_state").notNull(), rollbackStatus: text("rollback_status").notNull(), reason: text("reason"), removedSkuIds: jsonb("removed_sku_ids").notNull().default([]), rollbackSkuIds: jsonb("rollback_sku_ids").notNull().default([]), approvalStatus: text("approval_status").notNull(), idempotencyKey: text("idempotency_key").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), metadataJson: jsonb("metadata_json").notNull().default({})
});
