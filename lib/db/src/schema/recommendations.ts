import { pgTable, serial, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  displayName: text("display_name").notNull(),
  licenceSku: text("licence_sku").notNull(),
  monthlyCost: real("monthly_cost").notNull(),
  annualisedCost: real("annualised_cost").notNull(),
  pricingConfidence: text("pricing_confidence").notNull().default("UNKNOWN"),
  pricingSource: text("pricing_source").notNull().default(""),
  trustScore: real("trust_score").notNull(),
  entityTrustScore: real("entity_trust_score").notNull(),
  recommendationTrustScore: real("recommendation_trust_score").notNull(),
  executionReadinessScore: real("execution_readiness_score").notNull(),
  executionStatus: text("execution_status").notNull(),
  criticalBlockers: jsonb("critical_blockers").notNull().default([]),
  warnings: jsonb("warnings").notNull().default([]),
  scoreBreakdown: jsonb("score_breakdown").notNull().default({}),
  status: text("status").notNull().default("pending"),
  playbook: text("playbook").notNull(),
  playbookId: text("playbook_id").notNull().default(""),
  playbookName: text("playbook_name").notNull().default(""),
  playbookEvidence: jsonb("playbook_evidence").notNull().default({}),
  playbookRequiredSignals: jsonb("playbook_required_signals").notNull().default([]),
  playbookExclusions: jsonb("playbook_exclusions").notNull().default([]),
  evaluationEventId: text("evaluation_event_id").notNull().default(""),
  connector: text("connector").notNull(),
  ingestionRunId: text("ingestion_run_id").notNull().default(""),
  sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }),
  connectorHealth: text("connector_health").notNull().default("HEALTHY"),
  dataFreshnessScore: real("data_freshness_score").notNull().default(1.0),
  freshnessBand: text("freshness_band").notNull().default("0_7"),
  partialData: text("partial_data").notNull().default("false"),
  connectorHealthSnapshot: jsonb("connector_health_snapshot").notNull().default({}),
  lastActivity: timestamp("last_activity", { withTimezone: true }),
  daysSinceActivity: integer("days_since_activity"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
