import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pilotProfilesTable = pgTable("pilot_profiles", {
  tenantId: text("tenant_id").primaryKey(),
  enabledConnectors: jsonb("enabled_connectors").notNull().default([]),
  enabledPlaybooks: jsonb("enabled_playbooks").notNull().default([]),
  defaultTrustThresholds: jsonb("default_trust_thresholds").notNull().default({}),
  approvalRequirements: jsonb("approval_requirements").notNull().default({}),
  telemetryRetentionDays: text("telemetry_retention_days").notNull().default("30"),
  workflowSlaDefaults: jsonb("workflow_sla_defaults").notNull().default({}),
  policyExceptionDefaults: jsonb("policy_exception_defaults").notNull().default({}),
  demoMode: text("demo_mode").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
