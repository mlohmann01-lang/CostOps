import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDateTime, formatCurrency, formatPercent } from './formatters'

test('formatDate formats a known ISO date in en-AU style', () => {
  assert.equal(formatDate('2026-06-01T09:00:00.000Z'), '1 Jun 2026')
})

test('formatDate returns Not available for null/undefined/invalid', () => {
  assert.equal(formatDate(null), 'Not available')
  assert.equal(formatDate(undefined), 'Not available')
  assert.equal(formatDate('not-a-date'), 'Not available')
})

test('formatDateTime returns Not available for null/undefined', () => {
  assert.equal(formatDateTime(null), 'Not available')
  assert.equal(formatDateTime(undefined), 'Not available')
})

test('formatDateTime formats a valid date', () => {
  const result = formatDateTime('2026-06-01T09:00:00.000Z')
  assert.ok(result.includes('2026'))
  assert.notEqual(result, 'Not available')
})

test('formatCurrency returns Not available for null/undefined/NaN', () => {
  assert.equal(formatCurrency(null), 'Not available')
  assert.equal(formatCurrency(undefined), 'Not available')
  assert.equal(formatCurrency(NaN), 'Not available')
})

test('formatCurrency formats a number as currency', () => {
  const result = formatCurrency(1000)
  assert.notEqual(result, 'Not available')
  assert.ok(/\d/.test(result))
})

test('formatPercent returns Not available for null/undefined/NaN', () => {
  assert.equal(formatPercent(null), 'Not available')
  assert.equal(formatPercent(undefined), 'Not available')
  assert.equal(formatPercent(NaN), 'Not available')
})

test('formatPercent formats a rounded percent', () => {
  assert.equal(formatPercent(42.6), '43%')
})
