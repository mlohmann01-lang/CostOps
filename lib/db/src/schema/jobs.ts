import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const scheduledJobsTable = pgTable("scheduled_jobs", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull().default("default"), jobType: text("job_type").notNull(), jobName: text("job_name").notNull(), enabled: text("enabled").notNull().default("true"), scheduleConfig: jsonb("schedule_config").notNull().default({}), lastRunAt: timestamp("last_run_at", { withTimezone: true }), nextRunAt: timestamp("next_run_at", { withTimezone: true }), status: text("status").notNull().default("PENDING"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const jobRunsTable = pgTable("job_runs", {
  id: serial("id").primaryKey(), scheduledJobId: integer("scheduled_job_id"), tenantId: text("tenant_id").notNull().default("default"), jobType: text("job_type").notNull(), status: text("status").notNull().default("RUNNING"), startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(), completedAt: timestamp("completed_at", { withTimezone: true }), durationMs: integer("duration_ms").notNull().default(0), recordsProcessed: integer("records_processed").notNull().default(0), recordsSucceeded: integer("records_succeeded").notNull().default(0), recordsFailed: integer("records_failed").notNull().default(0), warnings: jsonb("warnings").notNull().default([]), errors: jsonb("errors").notNull().default([]), evidence: jsonb("evidence").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deadLetterJobsTable = pgTable("dead_letter_jobs", {
  id: serial("id").primaryKey(), jobRunId: text("job_run_id").notNull(), tenantId: text("tenant_id").notNull().default("default"), jobType: text("job_type").notNull(), reason: text("reason").notNull(), payload: jsonb("payload").notNull().default({}), error: jsonb("error").notNull().default({}), retryCount: integer("retry_count").notNull().default(0), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
