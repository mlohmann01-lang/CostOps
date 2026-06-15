import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const technologyCommercialAuthorityRecordsTable = pgTable("technology_commercial_authority_records", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  collection: text("collection").notNull(),
  recordId: text("record_id").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  tenantCollectionRecordIdx: uniqueIndex("tech_commercial_authority_tenant_collection_record_idx").on(table.tenantId, table.collection, table.recordId),
  tenantCollectionIdx: index("tech_commercial_authority_tenant_collection_idx").on(table.tenantId, table.collection),
}));
