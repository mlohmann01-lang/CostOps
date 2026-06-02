import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateM365SkuCost } from '../lib/playbooks/m365/m365-sku-cost-authority'

test('SKU cost authority ranks pricing sources and preserves estimates as low confidence', () => {
  assert.equal(estimateM365SkuCost({ skuId: 'sku-e5', skuPartNumber: 'M365_E5', contractPricing: { M365_E5: 40 } }).confidence, 'HIGH')
  assert.equal(estimateM365SkuCost({ skuId: 'sku-e3', skuPartNumber: 'M365_E3', catalogPricing: { M365_E3: 30 } }).confidence, 'MEDIUM')
  const estimated = estimateM365SkuCost({ skuId: 'sku-copilot', skuPartNumber: 'COPILOT' })
  assert.equal(estimated.source, 'ESTIMATED')
  assert.equal(estimated.confidence, 'LOW')
  const unknown = estimateM365SkuCost({ skuId: 'sku-unknown', skuPartNumber: 'NOT_A_REAL_SKU' })
  assert.equal(unknown.source, 'UNKNOWN')
  assert.equal(unknown.confidence, 'UNKNOWN')
})
