import type { VendorChangeCategory, VendorChangeSeverity, VendorChangeEvent } from './vendor-change-types'
import type { VendorSignal } from './vendor-signal-types'

export type ClassifierConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type VendorChangeDraft = VendorChangeEvent & { sourceSignalId: string; classifierConfidence: ClassifierConfidence; classificationReasons: string[]; evidenceRefs: string[]; hash: string }

type Rule = { category: VendorChangeCategory; severity: VendorChangeSeverity; confidence: ClassifierConfidence; keywords: string[]; reason: string }
const rules: Rule[] = [
  { category: 'PRICE_CHANGE', severity: 'HIGH', confidence: 'HIGH', keywords: ['price increase', 'pricing update', 'price change', 'rate increase'], reason: 'pricing language detected' },
  { category: 'RETIREMENT', severity: 'HIGH', confidence: 'HIGH', keywords: ['retirement', 'retire', 'end of support', 'end-of-support', 'eol'], reason: 'retirement/end-of-support language detected' },
  { category: 'BUNDLE_CHANGE', severity: 'MEDIUM', confidence: 'HIGH', keywords: ['new bundle', 'bundle', 'packaging update', 'packaging change'], reason: 'bundle/packaging language detected' },
  { category: 'LICENSING_CHANGE', severity: 'HIGH', confidence: 'HIGH', keywords: ['licensing terms', 'license terms', 'licensing change', 'license change'], reason: 'licensing language detected' },
  { category: 'COMMITMENT_CHANGE', severity: 'MEDIUM', confidence: 'MEDIUM', keywords: ['savings plan', 'commitment', 'committed use', 'reserved instance'], reason: 'commitment discount language detected' },
  { category: 'DISCOUNT_CHANGE', severity: 'MEDIUM', confidence: 'MEDIUM', keywords: ['discount', 'discount update', 'rebate'], reason: 'discount language detected' },
  { category: 'SKU_CHANGE', severity: 'MEDIUM', confidence: 'MEDIUM', keywords: ['sku', 'edition', 'plan'], reason: 'SKU language detected' },
  { category: 'POLICY_CHANGE', severity: 'MEDIUM', confidence: 'MEDIUM', keywords: ['policy', 'terms of service', 'contract terms'], reason: 'policy language detected' },
  { category: 'FEATURE_CHANGE', severity: 'LOW', confidence: 'LOW', keywords: ['feature', 'guidance', 'optimization', 'optimisation'], reason: 'feature/guidance language detected' },
]

export function classifyVendorSignal(signal: VendorSignal): VendorChangeDraft {
  const text = `${signal.title} ${signal.rawText}`.toLowerCase()
  const matched = rules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword))) ?? rules[rules.length - 1]
  const effectiveDate = signal.publishedAt ?? signal.detectedAt
  const id = `vc-${signal.vendor.toLowerCase()}-${matched.category.toLowerCase().replaceAll('_', '-')}-${signal.hash.slice(0, 10)}`
  return { id, vendor: signal.vendor, category: matched.category, title: signal.title, description: signal.rawText.slice(0, 500) || signal.title, effectiveDate, sourceUrl: signal.sourceUrl, impactSeverity: matched.severity, detectedAt: signal.detectedAt, sourceSignalId: signal.signalId, classifierConfidence: matched.confidence, classificationReasons: [matched.reason], evidenceRefs: [`vendor-signal:${signal.signalId}`, signal.sourceUrl], hash: signal.hash }
}
