export type M365SkuKey = 'E5' | 'E3' | 'E1' | 'F3' | 'COPILOT' | 'COMMON_ADDON'

export const DEFAULT_M365_MONTHLY_PRICES: Record<M365SkuKey, number> = {
  E5: 57,
  E3: 36,
  E1: 10,
  F3: 8,
  COPILOT: 30,
  COMMON_ADDON: 12,
}

export function canonicalM365Sku(sku: string | undefined | null): M365SkuKey | 'UNKNOWN' {
  const value = String(sku ?? '').toUpperCase()
  if (value.includes('COPILOT')) return 'COPILOT'
  if (value.includes('E5')) return 'E5'
  if (value.includes('E3')) return 'E3'
  if (value.includes('E1')) return 'E1'
  if (value.includes('F3')) return 'F3'
  if (value.includes('ADDON') || value.includes('ADD-ON') || value.includes('VISIO') || value.includes('PROJECT') || value.includes('POWER') || value.includes('PHONE')) return 'COMMON_ADDON'
  return 'UNKNOWN'
}

export function getM365MonthlyPrice(sku: string | undefined | null, overrides: Partial<Record<M365SkuKey, number>> = {}) {
  const key = canonicalM365Sku(sku)
  if (key === 'UNKNOWN') return 0
  const envKey = `M365_PRICE_${key}`
  const env = Number(process.env[envKey])
  return Number.isFinite(env) && env > 0 ? env : overrides[key] ?? DEFAULT_M365_MONTHLY_PRICES[key]
}

export function calculateMonthlyDelta(currentSku: string, proposedSku: string, overrides: Partial<Record<M365SkuKey, number>> = {}) {
  return Math.max(0, Number((getM365MonthlyPrice(currentSku, overrides) - getM365MonthlyPrice(proposedSku, overrides)).toFixed(2)))
}

export function calculateAnnualizedSavings(monthlySavings: number) {
  return Number((Math.max(0, monthlySavings) * 12).toFixed(2))
}
