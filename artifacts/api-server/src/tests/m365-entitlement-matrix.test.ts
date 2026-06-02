import test from 'node:test'
import assert from 'node:assert/strict'
import { lookupM365EntitlementRelationship } from '../lib/playbooks/m365/m365-entitlement-matrix'

test('entitlement matrix requires explicit relationships and defaults unknown safely', () => {
  const e3 = lookupM365EntitlementRelationship('SPE_E5', 'SPE_E3')
  assert.equal(e3.relationship, 'INCLUDES')
  assert.equal(e3.confidence, 'HIGH')
  const powerBi = lookupM365EntitlementRelationship('SPE_E5', 'POWER_BI_PRO')
  assert.equal(powerBi.relationship, 'OVERLAPS')
  assert.equal(powerBi.confidence, 'MEDIUM')
  const unknown = lookupM365EntitlementRelationship('SPE_E5', 'TEAMS_PHONE')
  assert.equal(unknown.relationship, 'UNKNOWN')
  assert.equal(unknown.confidence, 'LOW')
})
