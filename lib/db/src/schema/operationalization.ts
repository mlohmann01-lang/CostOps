import { pgTable, serial, text, timestamp, jsonb, real, integer } from "drizzle-orm/pg-core";

export const discoveredAppsTable = pgTable("discovered_apps", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  appKey: text("app_key").notNull(),
  displayName: text("display_name").notNull(),
  vendor: text("vendor").notNull(),
  category: text("category"),
  sourceSystems: jsonb("source_systems").notNull().default([]),
  aliases: jsonb("aliases").notNull().default([]),
  owner: text("owner"),
  department: text("department"),
  costCenter: text("cost_center"),
  contractIds: jsonb("contract_ids").notNull().default([]),
  entitlementCount: integer("entitlement_count").notNull().default(0),
  userCount: integer("user_count").notNull().default(0),
  monthlyCost: real("monthly_cost"),
  annualCost: real("annual_cost"),
  discoveryConfidence: real("discovery_confidence").notNull().default(0),
  onboardingConfidence: real("onboarding_confidence").notNull().default(0),
  priorityScore: real("priority_score").notNull().default(0),
  status: text("status").notNull().default("DISCOVERED"),
  evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const entitlementOwnershipEdgesTable = pgTable("entitlement_ownership_edges", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), appKey: text("app_key").notNull(),
  userPrincipalName: text("user_principal_name"), entitlementId: text("entitlement_id"), skuId: text("sku_id"), skuPartNumber: text("sku_part_number"),
  sourceSystem: text("source_system").notNull(), owner: text("owner"), department: text("department"), costCenter: text("cost_center"),
  confidence: real("confidence").notNull(), evidence: jsonb("evidence").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const metadataMappingEventsTable = pgTable("metadata_mapping_events", {
  id: serial("id").primaryKey(), tenantId: text("tenant_id").notNull(), mappingType: text("mapping_type").notNull(),
  sourceValue: text("source_value").notNull(), canonicalValue: text("canonical_value").notNull(), confidence: real("confidence").notNull(),
  sourceSystems: jsonb("source_systems").notNull().default([]), evidence: jsonb("evidence").notNull().default({}),
  status: text("status").notNull().default("PROPOSED"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
