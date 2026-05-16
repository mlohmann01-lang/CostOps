import { index, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const recommendationRationalesTable = pgTable("recommendation_rationales", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  recommendationId: integerText("recommendation_id").notNull(),
  connectorType: text("connector_type").notNull().default("m365"),
  playbookId: text("playbook_id").notNull(),
  playbookName: text("playbook_name").notNull(),
  recommendationStatus: text("recommendation_status").notNull(),
  trustBand: text("trust_band").notNull().default("MEDIUM"),
  overallTrustScore: real("overall_trust_score").notNull().default(0),
  projectedSavingsMonthly: real("projected_savings_monthly").notNull().default(0),
  projectedSavingsAnnualized: real("projected_savings_annualized").notNull().default(0),
  projectedSavingsConfidence: text("projected_savings_confidence").notNull().default("MEDIUM"),
  whyGenerated: jsonb("why_generated").notNull().default({}),
  whySafe: jsonb("why_safe").notNull().default({}),
  whyBlocked: jsonb("why_blocked").notNull().default({}),
  whyDowngraded: jsonb("why_downgraded").notNull().default({}),
  trustFactors: jsonb("trust_factors").notNull().default({}),
  reconciliationFactors: jsonb("reconciliation_factors").notNull().default({}),
  governanceFactors: jsonb("governance_factors").notNull().default({}),
  runtimeFactors: jsonb("runtime_factors").notNull().default({}),
  projectedSavingsFactors: jsonb("projected_savings_factors").notNull().default({}),
  evidenceLineage: jsonb("evidence_lineage").notNull().default({}),
  evidenceRecordIds: jsonb("evidence_record_ids").notNull().default([]),
  connectorTrustSnapshotId: text("connector_trust_snapshot_id").notNull().default(""),
  explainabilityVersion: text("explainability_version").notNull().default("checkpoint-24-v1"),
  deterministicHash: text("deterministic_hash").notNull(),
  reasoningSchemaVersion: text("reasoning_schema_version").notNull().default("rationale-schema-v1"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("recommendation_rationales_tenant_recommendation_idx").on(table.tenantId, table.recommendationId),
  index("recommendation_rationales_tenant_generated_idx").on(table.tenantId, table.generatedAt),
  index("recommendation_rationales_tenant_status_idx").on(table.tenantId, table.recommendationStatus),
]);

function integerText(name: string) {
  return text(name);
}

