import { pgTable, serial, text, timestamp, uniqueIndex, jsonb, real, integer } from "drizzle-orm/pg-core";

export const flexeraEntitlementsTable = pgTable(
  "flexera_entitlements",
  {
    id: serial("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    sourceObjectId: text("source_object_id").notNull(),
    userPrincipalName: text("user_principal_name"),
    productName: text("product_name").notNull(),
    skuId: text("sku_id"),
    skuPartNumber: text("sku_part_number"),
    entitlementQuantity: integer("entitlement_quantity").notNull(),
    consumedQuantity: integer("consumed_quantity"),
    cost: real("cost"),
    currency: text("currency"),
    contractId: text("contract_id"),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    ingestionRunId: text("ingestion_run_id").notNull(),
    connectorHealth: text("connector_health").notNull(),
    sourceMetadata: jsonb("source_metadata").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({ uniqTenantObject: uniqueIndex("flexera_entitlements_tenant_object_uniq").on(t.tenantId, t.sourceObjectId) })
);
