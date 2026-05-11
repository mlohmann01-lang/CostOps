import { pgTable, serial, text, timestamp, uniqueIndex, jsonb, real } from "drizzle-orm/pg-core";

export const servicenowContractsTable = pgTable("servicenow_contracts", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  sourceObjectId: text("source_object_id").notNull(),
  vendor: text("vendor").notNull(),
  contractNumber: text("contract_number"),
  productName: text("product_name"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  annualCost: real("annual_cost"),
  currency: text("currency"),
  owner: text("owner"),
  sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
  ingestionRunId: text("ingestion_run_id").notNull(),
  connectorHealth: text("connector_health").notNull(),
  sourceMetadata: jsonb("source_metadata").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({ uniqTenantObject: uniqueIndex("servicenow_contracts_tenant_object_uniq").on(t.tenantId, t.sourceObjectId) }));
