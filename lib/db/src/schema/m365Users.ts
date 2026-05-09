import { pgTable, serial, text, integer, timestamp, uniqueIndex, jsonb, real } from "drizzle-orm/pg-core";

export const m365UsersTable = pgTable(
  "m365_users",
  {
    id: serial("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    sourceObjectId: text("source_object_id").notNull(),
    userPrincipalName: text("user_principal_name").notNull(),
    displayName: text("display_name"),
    accountEnabled: text("account_enabled").notNull(),
    assignedLicenses: jsonb("assigned_licenses").notNull().$type<string[]>(),
    lastLoginDaysAgo: integer("last_login_days_ago"),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    ingestionRunId: text("ingestion_run_id").notNull(),
    connectorHealth: text("connector_health").notNull(),
    dataFreshnessScore: real("data_freshness_score").notNull(),
    freshnessBand: text("freshness_band").notNull(),
    partialData: text("partial_data").notNull().default("false"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqTenantObject: uniqueIndex("m365_users_tenant_object_uniq").on(t.tenantId, t.sourceObjectId),
  })
);
