import { pgTable, serial, text, timestamp, jsonb, real, integer } from "drizzle-orm/pg-core";

export const operationalizationPacksTable = pgTable("operationalization_packs", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  packType: text("pack_type").notNull(),
  status: text("status").notNull().default("NOT_STARTED"),
  onboardingConfidence: real("onboarding_confidence").notNull().default(0),
  readinessScore: real("readiness_score").notNull().default(0),
  appsTotal: integer("apps_total").notNull().default(0),
  appsReady: integer("apps_ready").notNull().default(0),
  appsBlocked: integer("apps_blocked").notNull().default(0),
  blockersSummary: jsonb("blockers_summary").notNull().default({}),
  recommendationsSummary: jsonb("recommendations_summary").notNull().default({}),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const operationalizationPackEventsTable = pgTable("operationalization_pack_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  packId: integer("pack_id").notNull(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("INFO"),
  appKey: text("app_key"),
  message: text("message").notNull(),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
