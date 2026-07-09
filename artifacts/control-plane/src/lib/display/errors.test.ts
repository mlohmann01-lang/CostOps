import { test } from 'node:test'
import assert from 'node:assert/strict'
import { customerFacingError } from './errors'

test('customerFacingError never includes raw 404 status code', () => {
  const result = customerFacingError('Live data unavailable (404)')
  assert.ok(!result.includes('404'))
})

test('customerFacingError never includes raw 403/500 status codes', () => {
  assert.ok(!customerFacingError('Request failed with status 403').includes('403'))
  assert.ok(!customerFacingError('Server error 500').includes('500'))
})

test('customerFacingError falls back to a generic message for unknown errors', () => {
  assert.equal(customerFacingError(new Error('Something exploded')), 'This information is currently unavailable.')
})

test('customerFacingError handles non-error inputs without throwing', () => {
  assert.doesNotThrow(() => customerFacingError(undefined))
  assert.doesNotThrow(() => customerFacingError({ foo: 'bar' }))
})
