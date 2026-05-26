import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const recommendationGovernanceEventsTable = pgTable("recommendation_governance_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  recommendationId: text("recommendation_id").notNull(),
  eventType: text("event_type").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  eventReason: text("event_reason").notNull().default(""),
  beforeState: text("before_state").notNull().default(""),
  afterState: text("after_state").notNull().default(""),
  beforeReadiness: text("before_readiness").notNull().default(""),
  afterReadiness: text("after_readiness").notNull().default(""),
  evidenceSnapshot: jsonb("evidence_snapshot").notNull().default([]),
  approvalSnapshot: jsonb("approval_snapshot").notNull().default({}),
  blockedReasonsSnapshot: jsonb("blocked_reasons_snapshot").notNull().default([]),
  readinessReasonsSnapshot: jsonb("readiness_reasons_snapshot").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("recommendation_governance_events_tenant_idx").on(t.tenantId), index("recommendation_governance_events_rec_idx").on(t.recommendationId), index("recommendation_governance_events_type_idx").on(t.eventType)]);
