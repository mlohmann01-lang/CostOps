import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const governanceExceptionsTable = pgTable("governance_exceptions", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  exceptionType: text("exception_type").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  recommendationId: text("recommendation_id"),
  policyId: integer("policy_id"),
  requestedBy: text("requested_by").notNull(),
  approvedBy: text("approved_by"),
  status: text("status").notNull().default("PENDING"),
  reason: text("reason").notNull(),
  businessJustification: text("business_justification").notNull().default(""),
  riskAccepted: text("risk_accepted").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const governanceExceptionEventsTable = pgTable("governance_exception_events", {
  id: serial("id").primaryKey(),
  exceptionId: integer("exception_id").notNull(),
  tenantId: text("tenant_id").notNull().default("default"),
  actorId: text("actor_id").notNull(),
  eventType: text("event_type").notNull(),
  reason: text("reason").notNull().default(""),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
