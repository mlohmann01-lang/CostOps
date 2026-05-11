import { pgTable, serial, text, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const servicenowAssetsTable = pgTable("servicenow_assets", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  sourceObjectId: text("source_object_id").notNull(),
  assetTag: text("asset_tag"),
  assignedTo: text("assigned_to"),
  userPrincipalName: text("user_principal_name"),
  department: text("department"),
  costCenter: text("cost_center"),
  owner: text("owner"),
  status: text("status"),
  contractId: text("contract_id"),
  sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
  ingestionRunId: text("ingestion_run_id").notNull(),
  connectorHealth: text("connector_health").notNull(),
  sourceMetadata: jsonb("source_metadata").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({ uniqTenantObject: uniqueIndex("servicenow_assets_tenant_object_uniq").on(t.tenantId, t.sourceObjectId) }));
