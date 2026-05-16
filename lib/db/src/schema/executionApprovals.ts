import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const executionApprovalsTable = pgTable("execution_approvals", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  approvalType: text("approval_type").notNull(),
  requiredApprovals: integer("required_approvals").notNull().default(1),
  currentApprovals: integer("current_approvals").notNull().default(0),
  approvalStatus: text("approval_status").notNull().default("PENDING"),
  requestedBy: text("requested_by").notNull(),
  approvedBy: jsonb("approved_by").notNull().default([]),
  rejectedBy: jsonb("rejected_by").notNull().default([]),
  approvalEvidence: jsonb("approval_evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
