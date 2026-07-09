import { test } from 'node:test'
import assert from 'node:assert/strict'
import { displayLabel } from './labels'

test('displayLabel maps known enum keys to human labels', () => {
  assert.equal(displayLabel('AI_ASSET'), 'AI Asset')
  assert.equal(displayLabel('CREATE_NEW_GOVERNED_ACTION'), 'Create Governed Action')
})

test('displayLabel falls back to title case for unknown values', () => {
  assert.equal(displayLabel('SOME_UNKNOWN_VALUE'), 'Some Unknown Value')
  assert.equal(displayLabel('already-kebab'), 'Already Kebab')
})

test('displayLabel handles null/undefined', () => {
  // @ts-expect-error testing runtime guard against nullish input
  assert.equal(displayLabel(null), 'Not available')
  // @ts-expect-error testing runtime guard against nullish input
  assert.equal(displayLabel(undefined), 'Not available')
})
