import { calculateAnnualizedSavings, getM365MonthlyPrice } from './m365-pricing'
import type { SavingsConfidence } from './m365-economic-intelligence-types'

export type M365SkuCostSource = 'CONTRACT' | 'INVOICE' | 'TENANT_PRICE' | 'CATALOG' | 'ESTIMATED' | 'UNKNOWN'

export interface M365SkuCostEstimate {
  skuId: string
  skuPartNumber?: string
  monthlyUnitCost: number
  annualUnitCost: number
  currency: string
  source: M365SkuCostSource
  confidence: SavingsConfidence
  reasons: string[]
}

export interface M365SkuCostAuthorityInput {
  skuId: string
  skuPartNumber?: string
  tenantPricing?: Record<string, number>
  contractPricing?: Record<string, number>
  invoicePricing?: Record<string, number>
  catalogPricing?: Record<string, number>
  currency?: string
}

export const M365_TEST_FIXTURE_COST_TABLE: Record<string, number> = {
  M365_E5: 57,
  SPE_E5: 57,
  M365_E3: 36,
  SPE_E3: 36,
  POWER_BI_PRO: 12,
  COPILOT: 30,
  TEAMS_PHONE: 8,
  DEFENDER: 5,
  DEFENDER_ENDPOINT: 5,
  ENTRA_PREMIUM: 6,
  AAD_PREMIUM: 6,
  EXCHANGE_ARCHIVE: 3,
}

function keys(input: M365SkuCostAuthorityInput) {
  const skuId = String(input.skuId ?? '').toUpperCase()
  const skuPartNumber = String(input.skuPartNumber ?? '').toUpperCase()
  return Array.from(new Set([skuId, skuPartNumber].filter(Boolean)))
}

function lookup(table: Record<string, number> | undefined, lookupKeys: string[]) {
  if (!table) return null
  for (const key of lookupKeys) {
    const exact = Number(table[key])
    if (Number.isFinite(exact) && exact > 0) return exact
    const match = Object.entries(table).find(([candidate]) => key.includes(candidate.toUpperCase()) || candidate.toUpperCase().includes(key))
    if (match && Number(match[1]) > 0) return Number(match[1])
  }
  return null
}

function estimate(input: M365SkuCostAuthorityInput, monthlyUnitCost: number, source: M365SkuCostSource, confidence: SavingsConfidence, reasons: string[]): M365SkuCostEstimate {
  return { skuId: input.skuId, skuPartNumber: input.skuPartNumber, monthlyUnitCost, annualUnitCost: calculateAnnualizedSavings(monthlyUnitCost), currency: input.currency ?? 'USD', source, confidence, reasons }
}

export function estimateM365SkuCost(input: M365SkuCostAuthorityInput): M365SkuCostEstimate {
  const lookupKeys = keys(input)
  const invoice = lookup(input.invoicePricing, lookupKeys)
  if (invoice != null) return estimate(input, invoice, 'INVOICE', 'HIGH', ['Invoice pricing matched for SKU.'])
  const contract = lookup(input.contractPricing, lookupKeys)
  if (contract != null) return estimate(input, contract, 'CONTRACT', 'HIGH', ['Contract pricing matched for SKU.'])
  const tenant = lookup(input.tenantPricing, lookupKeys)
  if (tenant != null) return estimate(input, tenant, 'TENANT_PRICE', 'HIGH', ['Tenant-specific pricing matched for SKU.'])
  const catalog = lookup(input.catalogPricing, lookupKeys)
  if (catalog != null) return estimate(input, catalog, 'CATALOG', 'MEDIUM', ['Configured catalog pricing matched for SKU.'])
  const fixture = lookup(M365_TEST_FIXTURE_COST_TABLE, lookupKeys)
  if (fixture != null) return estimate(input, fixture, 'ESTIMATED', 'LOW', ['Static M365 fixture estimate used; not execution-grade pricing.'])
  const legacy = getM365MonthlyPrice(input.skuPartNumber ?? input.skuId)
  if (legacy > 0) return estimate(input, legacy, 'ESTIMATED', 'LOW', ['Legacy default M365 estimate used; not tenant-specific pricing.'])
  return estimate(input, 0, 'UNKNOWN', 'UNKNOWN', ['No SKU cost source matched; savings are unknown and not execution eligible.'])
}

export function aggregateSavingsConfidence(estimates: M365SkuCostEstimate[]): SavingsConfidence {
  if (estimates.length === 0) return 'HIGH'
  if (estimates.some((estimate) => estimate.confidence === 'UNKNOWN')) return 'UNKNOWN'
  if (estimates.some((estimate) => estimate.confidence === 'LOW')) return 'LOW'
  if (estimates.some((estimate) => estimate.confidence === 'MEDIUM')) return 'MEDIUM'
  return 'HIGH'
}
