import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  displayName: text("display_name").notNull(),
  licenceSku: text("licence_sku").notNull(),
  monthlyCost: real("monthly_cost").notNull(),
  annualisedCost: real("annualised_cost").notNull(),
  trustScore: real("trust_score").notNull(),
  executionStatus: text("execution_status").notNull(),
  status: text("status").notNull().default("pending"),
  playbook: text("playbook").notNull(),
  connector: text("connector").notNull(),
  lastActivity: timestamp("last_activity", { withTimezone: true }),
  daysSinceActivity: integer("days_since_activity"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
