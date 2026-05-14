import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const tenantOnboardingTable = pgTable("tenant_onboarding", {
  tenantId: text("tenant_id").primaryKey(),
  currentStep: text("current_step").notNull().default("TENANT_SETUP"),
  completedSteps: jsonb("completed_steps").notNull().default([]),
  connectorStatuses: jsonb("connector_statuses").notNull().default({}),
  readinessSummary: jsonb("readiness_summary").notNull().default({}),
  onboardingStatus: text("onboarding_status").notNull().default("IN_PROGRESS"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
