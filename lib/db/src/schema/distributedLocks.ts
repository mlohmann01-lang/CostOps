import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const distributedLocksTable = pgTable("distributed_locks", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  lockType: text("lock_type").notNull(),
  lockedBy: text("locked_by").notNull(),
  lockExpiresAt: timestamp("lock_expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  metadataJson: jsonb("metadata_json").notNull().default({}),
});
