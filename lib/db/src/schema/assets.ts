import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const assetsTable = pgTable("assets", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  assetType: text("asset_type").notNull().default("UNKNOWN"),
  displayName: text("display_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("UNKNOWN"),
  lifecycleState: text("lifecycle_state").notNull().default("DISCOVERED"),
  businessCriticality: text("business_criticality").notNull().default("UNKNOWN"),
  sourceOfRecord: text("source_of_record"),
  primarySourceSystem: text("primary_source_system"),
  primaryExternalId: text("primary_external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
}, (t) => [
  index("assets_tenant_idx").on(t.tenantId),
  index("assets_primary_source_idx").on(t.tenantId, t.primarySourceSystem, t.primaryExternalId),
  index("assets_normalized_name_idx").on(t.tenantId, t.assetType, t.normalizedName),
]);

export const assetSourceMappingsTable = pgTable("asset_source_mappings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  assetId: text("asset_id").notNull(),
  sourceSystem: text("source_system").notNull(),
  sourceEntityType: text("source_entity_type").notNull(),
  sourceEntityId: text("source_entity_id").notNull(),
  externalId: text("external_id"),
  sourceUrl: text("source_url"),
  confidence: text("confidence"),
  mappingMethod: text("mapping_method").notNull().default("UNKNOWN"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").notNull().default({}),
}, (t) => [
  index("asset_source_mappings_tenant_idx").on(t.tenantId),
  index("asset_source_mappings_asset_idx").on(t.tenantId, t.assetId),
  index("asset_source_mappings_source_idx").on(t.tenantId, t.sourceSystem, t.sourceEntityType, t.sourceEntityId),
  index("asset_source_mappings_external_idx").on(t.tenantId, t.sourceSystem, t.externalId),
]);

export const assetOwnersTable = pgTable("asset_owners", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  assetId: text("asset_id").notNull(),
  principalId: text("principal_id").notNull(),
  ownershipType: text("ownership_type").notNull().default("UNKNOWN"),
  sourceSystem: text("source_system"),
  sourceReference: text("source_reference"),
  confidence: text("confidence"),
  status: text("status").notNull().default("UNVERIFIED"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
}, (t) => [
  index("asset_owners_tenant_idx").on(t.tenantId),
  index("asset_owners_asset_idx").on(t.tenantId, t.assetId),
  index("asset_owners_principal_idx").on(t.tenantId, t.principalId),
  index("asset_owners_type_idx").on(t.tenantId, t.ownershipType),
]);
