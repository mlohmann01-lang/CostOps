import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const principalsTable = pgTable("principals", {
  id: text("id").primaryKey(), tenantId: text("tenant_id").notNull(), principalType: text("principal_type").notNull(), displayName: text("display_name").notNull(), email: text("email"), externalId: text("external_id"), sourceSystem: text("source_system"), status: text("status").notNull().default("UNKNOWN"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [uniqueIndex("principals_tenant_email_uidx").on(t.tenantId, t.email), uniqueIndex("principals_tenant_external_id_uidx").on(t.tenantId, t.externalId), index("principals_tenant_idx").on(t.tenantId)]);

export const principalAuthoritiesTable = pgTable("principal_authorities", {
  id: text("id").primaryKey(), tenantId: text("tenant_id").notNull(), principalId: text("principal_id").notNull(), authorityType: text("authority_type").notNull(), scopeType: text("scope_type").notNull(), scopeId: text("scope_id"), grantedByPrincipalId: text("granted_by_principal_id"), grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(), expiresAt: timestamp("expires_at", { withTimezone: true }), status: text("status").notNull().default("ACTIVE"),
}, (t) => [index("principal_authorities_tenant_principal_idx").on(t.tenantId, t.principalId), index("principal_authorities_scope_idx").on(t.tenantId, t.scopeType, t.scopeId)]);

export const principalActionEventsTable = pgTable("principal_action_events", {
  id: text("id").primaryKey(), tenantId: text("tenant_id").notNull(), principalId: text("principal_id").notNull(), actionContextType: text("action_context_type").notNull(), actionContextId: text("action_context_id").notNull(), role: text("role").notNull(), timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(), metadata: jsonb("metadata").notNull().default({}),
}, (t) => [index("principal_action_events_principal_idx").on(t.tenantId, t.principalId), index("principal_action_events_context_idx").on(t.tenantId, t.actionContextType, t.actionContextId)]);
