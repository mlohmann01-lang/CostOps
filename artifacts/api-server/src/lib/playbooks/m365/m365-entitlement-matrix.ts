export type M365EntitlementRelationshipType = 'INCLUDES' | 'OVERLAPS' | 'UNKNOWN'
export type M365EntitlementConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface M365EntitlementRelationship {
  parentSku: string
  includedSkuOrServicePlan: string
  relationship: M365EntitlementRelationshipType
  confidence: M365EntitlementConfidence
  evidence: string[]
}

const MATRIX: M365EntitlementRelationship[] = [
  { parentSku: 'SPE_E5', includedSkuOrServicePlan: 'SPE_E3', relationship: 'INCLUDES', confidence: 'HIGH', evidence: ['Explicit matrix v1: E5 includes E3-like suite capabilities.'] },
  { parentSku: 'M365_E5', includedSkuOrServicePlan: 'M365_E3', relationship: 'INCLUDES', confidence: 'HIGH', evidence: ['Explicit matrix v1: M365 E5 includes M365 E3-like suite capabilities.'] },
  { parentSku: 'SPE_E5', includedSkuOrServicePlan: 'POWER_BI_PRO', relationship: 'OVERLAPS', confidence: 'MEDIUM', evidence: ['Matrix v1 requires human review for Power BI Pro overlap; do not auto-remove.'] },
  { parentSku: 'SPE_E5', includedSkuOrServicePlan: 'DEFENDER', relationship: 'OVERLAPS', confidence: 'MEDIUM', evidence: ['Matrix v1 requires security-owner review for Defender overlap.'] },
  { parentSku: 'SPE_E5', includedSkuOrServicePlan: 'DEFENDER_ENDPOINT', relationship: 'OVERLAPS', confidence: 'MEDIUM', evidence: ['Matrix v1 requires security-owner review for Defender overlap.'] },
  { parentSku: 'SPE_E5', includedSkuOrServicePlan: 'ENTRA_PREMIUM', relationship: 'OVERLAPS', confidence: 'MEDIUM', evidence: ['Matrix v1 requires identity/security-owner review for Entra overlap.'] },
  { parentSku: 'SPE_E5', includedSkuOrServicePlan: 'AAD_PREMIUM', relationship: 'OVERLAPS', confidence: 'MEDIUM', evidence: ['Matrix v1 requires identity/security-owner review for Entra/AAD overlap.'] },
]

const norm = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
function matches(left: string, right: string) { const a = norm(left); const b = norm(right); return a === b || a.includes(b) || b.includes(a) }

export function lookupM365EntitlementRelationship(parentSku: string, includedSkuOrServicePlan: string): M365EntitlementRelationship {
  const found = MATRIX.find((row) => matches(parentSku, row.parentSku) && matches(includedSkuOrServicePlan, row.includedSkuOrServicePlan))
  if (found) return { ...found }
  return { parentSku, includedSkuOrServicePlan, relationship: 'UNKNOWN', confidence: 'LOW', evidence: ['No explicit entitlement matrix relationship found; overlap must not be assumed.'] }
}

export function lowestEntitlementConfidence(relationships: M365EntitlementRelationship[]) {
  if (relationships.length === 0) return 'LOW' as M365EntitlementConfidence
  if (relationships.some((row) => row.confidence === 'LOW' || row.relationship === 'UNKNOWN')) return 'LOW'
  if (relationships.some((row) => row.confidence === 'MEDIUM')) return 'MEDIUM'
  return 'HIGH'
}
