import { pgTable, serial, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rollbackEventsTable = pgTable("rollback_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  originalOutcomeLedgerId: text("original_outcome_ledger_id").notNull(),
  recommendationId: text("recommendation_id").notNull().default(""),
  rollbackAction: text("rollback_action").notNull(),
  actorId: text("actor_id").notNull(),
  status: text("status").notNull().default("EXECUTED"),
  idempotencyKey: text("idempotency_key").notNull(),
  beforeState: jsonb("before_state").notNull().default({}),
  afterState: jsonb("after_state").notNull().default({}),
  evidence: jsonb("evidence").notNull().default({}),
  executionMode: text("execution_mode").notNull().default("SIMULATED"),
  graphRequestId: text("graph_request_id").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("rollback_events_idempotency_key_unique").on(t.idempotencyKey)]);

export const insertRollbackEventsSchema = createInsertSchema(rollbackEventsTable).omit({ id: true, createdAt: true });
export type InsertRollbackEvent = z.infer<typeof insertRollbackEventsSchema>;
