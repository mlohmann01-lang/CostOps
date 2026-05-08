import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playbookEvaluationEventsTable = pgTable("playbook_evaluation_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  ingestionRunId: text("ingestion_run_id").notNull(),
  playbookId: text("playbook_id").notNull(),
  playbookName: text("playbook_name").notNull(),
  candidateType: text("candidate_type").notNull(),
  candidateId: text("candidate_id").notNull(),
  candidateDisplayName: text("candidate_display_name").notNull().default(""),
  matched: text("matched").notNull().default("false"),
  reason: text("reason").notNull().default(""),
  recommendedAction: text("recommended_action").notNull().default(""),
  exclusions: jsonb("exclusions").notNull().default([]),
  requiredSignals: jsonb("required_signals").notNull().default([]),
  missingSignals: jsonb("missing_signals").notNull().default([]),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlaybookEvaluationEventSchema = createInsertSchema(playbookEvaluationEventsTable).omit({ id: true, createdAt: true });
export type InsertPlaybookEvaluationEvent = z.infer<typeof insertPlaybookEvaluationEventSchema>;
export type PlaybookEvaluationEvent = typeof playbookEvaluationEventsTable.$inferSelect;
