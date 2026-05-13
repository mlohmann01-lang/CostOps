import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const approvalRequestsTable = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  recommendationId: text("recommendation_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  requiredApproverRole: text("required_approver_role").notNull().default("APPROVER"),
  status: text("status").notNull().default("PENDING"),
  riskClass: text("risk_class").notNull().default("B"),
  action: text("action").notNull().default("REMOVE_LICENSE"),
  reason: text("reason").notNull().default(""),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvalEventsTable = pgTable("approval_events", {
  id: serial("id").primaryKey(),
  approvalRequestId: integer("approval_request_id").notNull(),
  tenantId: text("tenant_id").notNull().default("default"),
  actorId: text("actor_id").notNull(),
  eventType: text("event_type").notNull(),
  reason: text("reason").notNull().default(""),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApprovalEventSchema = createInsertSchema(approvalEventsTable).omit({ id: true, createdAt: true });
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type InsertApprovalEvent = z.infer<typeof insertApprovalEventSchema>;
