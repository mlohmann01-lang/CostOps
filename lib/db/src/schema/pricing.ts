import { pgTable, serial, text, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pricingConfidenceEnum = [
  "VERIFIED_CONTRACT",
  "VERIFIED_INVOICE",
  "VERIFIED_CSP",
  "INFERRED",
  "PUBLIC_LIST",
  "UNKNOWN",
] as const;


export const pricingEvidenceSourceEnum = [
  "MANUAL_IMPORT",
  "CONTRACT_CONNECTOR",
  "INVOICE_CONNECTOR",
  "CSP_CONNECTOR",
  "FLEXERA_CONNECTOR",
  "PUBLIC_LIST",
] as const;

export const m365SkuCatalogTable = pgTable("m365_sku_catalog", {
  id: serial("id").primaryKey(),
  skuId: text("sku_id").notNull(),
  skuPartNumber: text("sku_part_number").notNull(),
  productName: text("product_name").notNull(),
  servicePlans: jsonb("service_plans").notNull().default([]),
  currency: text("currency").notNull().default("USD"),
  region: text("region").notNull().default("US"),
  listPriceMonthly: real("list_price_monthly").notNull(),
  listPriceAnnual: real("list_price_annual").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  source: text("source").notNull().default("PUBLIC"),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantSkuPricingTable = pgTable("tenant_sku_pricing", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  skuId: text("sku_id").notNull(),
  canonicalSkuId: text("canonical_sku_id").notNull().default(""),
  skuAliases: jsonb("sku_aliases").notNull().default([]),
  pricingSource: text("pricing_source").notNull(),
  effectiveMonthlyCost: real("effective_monthly_cost").notNull(),
  effectiveAnnualCost: real("effective_annual_cost").notNull(),
  currency: text("currency").notNull().default("USD"),
  originalCurrency: text("original_currency").notNull().default("USD"),
  originalMonthlyCost: real("original_monthly_cost").notNull().default(0),
  originalAnnualCost: real("original_annual_cost").notNull().default(0),
  fxRateUsed: real("fx_rate_used").notNull().default(1),
  fxRateSource: text("fx_rate_source").notNull().default("NONE"),
  fxTimestamp: timestamp("fx_timestamp", { withTimezone: true }),
  pricingConfidence: text("pricing_confidence").notNull().default("UNKNOWN"),
  evidenceSource: text("evidence_source").notNull().default("MANUAL_IMPORT"),
  evidenceId: text("evidence_id"),
  evidenceMetadata: jsonb("evidence_metadata").notNull().default({}),
  derivedFrom: text("derived_from").notNull().default(""),
  contractStart: timestamp("contract_start", { withTimezone: true }),
  contractEnd: timestamp("contract_end", { withTimezone: true }),
  approvalRequired: text("approval_required").notNull().default("false"),
  approvedBy: text("approved_by"),
  lastValidated: timestamp("last_validated", { withTimezone: true }).notNull().defaultNow(),
});

export const skuIdentityMapTable = pgTable("sku_identity_map", {
  id: serial("id").primaryKey(),
  canonicalSkuId: text("canonical_sku_id").notNull(),
  sourceSystem: text("source_system").notNull(),
  sourceSkuId: text("source_sku_id").notNull(),
  sourceSkuName: text("source_sku_name"),
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pricingDriftEventsTable = pgTable("pricing_drift_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  skuId: text("sku_id").notNull(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("MEDIUM"),
  priorState: jsonb("prior_state").notNull().default({}),
  currentState: jsonb("current_state").notNull().default({}),
  reason: text("reason").notNull().default(""),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
});


export const pricingEvidenceEventActionEnum = [
  "CREATED",
  "UPDATED",
  "SKIPPED_LOWER_CONFIDENCE",
  "REJECTED_INVALID",
] as const;

export const pricingEvidenceEventsTable = pgTable("pricing_evidence_events", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  skuId: text("sku_id").notNull(),
  skuPartNumber: text("sku_part_number"),
  evidenceSource: text("evidence_source").notNull(),
  pricingSource: text("pricing_source").notNull(),
  pricingConfidence: text("pricing_confidence").notNull(),
  effectiveMonthlyCost: real("effective_monthly_cost").notNull(),
  effectiveAnnualCost: real("effective_annual_cost").notNull(),
  currency: text("currency").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull().default(""),
  evidenceId: text("evidence_id"),
  evidenceMetadata: jsonb("evidence_metadata").notNull().default({}),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  actorId: text("actor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertM365SkuCatalogSchema = createInsertSchema(m365SkuCatalogTable).omit({ id: true });
export const insertTenantSkuPricingSchema = createInsertSchema(tenantSkuPricingTable).omit({ id: true });

export type PricingConfidence = typeof pricingConfidenceEnum[number];
export type PricingEvidenceSource = typeof pricingEvidenceSourceEnum[number];
export type InsertM365SkuCatalog = z.infer<typeof insertM365SkuCatalogSchema>;
export type InsertTenantSkuPricing = z.infer<typeof insertTenantSkuPricingSchema>;
