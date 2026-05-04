import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const connectorsTable = pgTable("connectors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("connected"),
  lastSync: timestamp("last_sync", { withTimezone: true }),
  recordCount: integer("record_count").notNull().default(0),
  trustScore: real("trust_score").notNull().default(0.85),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConnectorSchema = createInsertSchema(connectorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConnector = z.infer<typeof insertConnectorSchema>;
export type Connector = typeof connectorsTable.$inferSelect;
