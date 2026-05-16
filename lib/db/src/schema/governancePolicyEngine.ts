import { index, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const governancePolicyEngineTable = pgTable("governance_policies", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  policyKey: text("policy_key").notNull(),
  policyName: text("policy_name").notNull(),
  policyCategory: text("policy_category").notNull().default("GENERAL"),
  policyStatus: text("policy_status").notNull().default("DRAFT"),
  policyVersion: text("policy_version").notNull().default("v1"),
  scopeType: text("scope_type").notNull().default("TENANT"),
  scopeEntityIds: jsonb("scope_entity_ids").notNull().default([]),
  policyDefinition: jsonb("policy_definition").notNull().default({}),
  policyMetadata: jsonb("policy_metadata").notNull().default({}),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  deprecatedAt: timestamp("deprecated_at", { withTimezone: true }),
}, (t) => [
  index("gov_policy_tenant_idx").on(t.tenantId),
  index("gov_policy_key_idx").on(t.policyKey),
  index("gov_policy_version_idx").on(t.policyVersion),
  index("gov_policy_status_idx").on(t.policyStatus),
]);

export const governancePolicyEvaluationsTable = pgTable("governance_policy_evaluations", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  policyId: text("policy_id").notNull(),
  policyVersion: text("policy_version").notNull(),
  evaluationTargetType: text("evaluation_target_type").notNull(),
  evaluationTargetId: text("evaluation_target_id").notNull(),
  evaluationOutcome: text("evaluation_outcome").notNull(),
  evaluationReasoning: jsonb("evaluation_reasoning").notNull().default([]),
  evaluationEvidence: jsonb("evaluation_evidence").notNull().default({}),
  simulationCompatible: text("simulation_compatible").notNull().default("true"),
  deterministicHash: text("deterministic_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
