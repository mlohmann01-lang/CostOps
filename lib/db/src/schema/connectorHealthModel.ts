import { pgTable, serial, text, timestamp, jsonb, integer, real } from "drizzle-orm/pg-core";

export const connectorHealthModelTable = pgTable("connector_health_model", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  connectorId: text("connector_id").notNull(),
  provider: text("provider").notNull(),
  healthState: text("health_state").notNull().default("HEALTHY"),
  lastSuccessfulSyncAt: timestamp("last_successful_sync_at", { withTimezone: true }),
  lastFailedSyncAt: timestamp("last_failed_sync_at", { withTimezone: true }),
  failureCount: integer("failure_count").notNull().default(0),
  rateLimitUntil: timestamp("rate_limit_until", { withTimezone: true }),
  missingScopes: jsonb("missing_scopes").notNull().default([]),
  stalenessReason: text("staleness_reason"),
  capabilityAvailability: jsonb("capability_availability").notNull().default({}),
  trustScore: real("trust_score").notNull().default(1.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  metadataJson: jsonb("metadata_json").notNull().default({}),
});
