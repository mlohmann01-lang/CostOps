import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultAuthorities } from './defaultAuthorities'

const ALLOWED_STATUSES = ['ACTIVE', 'AVAILABLE', 'PREVIEW', 'PLANNED', 'BLOCKED']

test('defaultAuthorities has exactly 10 entries', () => {
  assert.equal(defaultAuthorities.length, 10)
})

test('all status values are one of the 5 allowed', () => {
  for (const authority of defaultAuthorities) {
    assert.ok(ALLOWED_STATUSES.includes(authority.status), `Unexpected status: ${authority.status}`)
  }
})

test('exactly 1 entry has status ACTIVE', () => {
  const activeCount = defaultAuthorities.filter((authority) => authority.status === 'ACTIVE').length
  assert.equal(activeCount, 1)
})

test('entry ids are unique', () => {
  const ids = defaultAuthorities.map((authority) => authority.id)
  assert.equal(new Set(ids).size, ids.length)
})
