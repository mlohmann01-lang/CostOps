import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const economicOperationsJobsTable = pgTable("economic_operations_jobs", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  jobType: text("job_type").notNull(),
  jobKey: text("job_key").notNull(),
  status: text("status").notNull().default("QUEUED"),
  priority: integer("priority").notNull().default(5),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  lastError: text("last_error"),
  lockedBy: text("locked_by"),
  lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }),
  idempotencyKey: text("idempotency_key").notNull(),
  payloadJson: jsonb("payload_json").notNull().default({}),
  resultJson: jsonb("result_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
