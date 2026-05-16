import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const workflowItemsTable = pgTable("workflow_items", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  workflowType: text("workflow_type").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  status: text("status").notNull().default("OPEN"),
  priorityBand: text("priority_band").notNull().default("MEDIUM"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  slaStatus: text("sla_status").notNull().default("HEALTHY"),
  assignedTeam: text("assigned_team"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({ tenantIdx: index("workflow_items_tenant_idx").on(t.tenantId) }));

export const workflowAssignmentsTable = pgTable("workflow_assignments", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), workflowItemId: text("workflow_item_id").notNull(), assigneeId: text("assignee_id").notNull(), assignedBy: text("assigned_by").notNull(), assignmentReason: text("assignment_reason").notNull(), assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(), unassignedAt: timestamp("unassigned_at", { withTimezone: true }),
}, (t) => ({ tenantIdx: index("workflow_assignments_tenant_idx").on(t.tenantId) }));

export const policyExceptionsTable = pgTable("policy_exceptions", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), policyId: text("policy_id").notNull(), policyVersion: text("policy_version").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(), exceptionStatus: text("exception_status").notNull().default("REQUESTED"), exceptionReason: text("exception_reason").notNull(), expiryAt: timestamp("expiry_at", { withTimezone: true }).notNull(), approvedBy: text("approved_by"), approvedAt: timestamp("approved_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ tenantIdx: index("policy_exceptions_tenant_idx").on(t.tenantId) }));

export const approvalDecisionsTable = pgTable("approval_decisions", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), workflowItemId: text("workflow_item_id").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(), decision: text("decision").notNull(), decisionReason: text("decision_reason").notNull(), decidedBy: text("decided_by").notNull(), decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(), decisionEvidence: jsonb("decision_evidence").notNull().default({}),
}, (t) => ({ tenantIdx: index("approval_decisions_tenant_idx").on(t.tenantId) }));
