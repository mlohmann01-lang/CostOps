import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkExposureReviewScopes,
  defaultExposureReviewScopes,
  EXPOSURE_REVIEW_ALLOWED_SCOPES,
  EXPOSURE_REVIEW_FORBIDDEN_SCOPES,
} from '../lib/connectors/m365/m365-exposure-scope-guard'

test('default scopes are exactly the allowlist', () => {
  assert.deepEqual(defaultExposureReviewScopes(), [...EXPOSURE_REVIEW_ALLOWED_SCOPES])
})

test('allowlist-only scopes pass', () => {
  const result = checkExposureReviewScopes([...EXPOSURE_REVIEW_ALLOWED_SCOPES])
  assert.equal(result.ok, true)
  assert.deepEqual(result.forbiddenScopesPresent, [])
})

test('benign default scopes do not count as unrecognized', () => {
  const result = checkExposureReviewScopes(['openid', 'profile', 'offline_access', 'email', ...EXPOSURE_REVIEW_ALLOWED_SCOPES])
  assert.equal(result.ok, true)
  assert.deepEqual(result.unrecognizedScopes, [])
})

test('unknown scope is reported as unrecognized but does not fail the check', () => {
  const result = checkExposureReviewScopes(['Some.Made.Up.Scope'])
  assert.equal(result.ok, true)
  assert.deepEqual(result.unrecognizedScopes, ['Some.Made.Up.Scope'])
})

for (const forbidden of EXPOSURE_REVIEW_FORBIDDEN_SCOPES) {
  test(`forbidden scope hard-fails discovery readiness: ${forbidden}`, () => {
    const result = checkExposureReviewScopes([...EXPOSURE_REVIEW_ALLOWED_SCOPES, forbidden])
    assert.equal(result.ok, false)
    assert.ok(result.forbiddenScopesPresent.includes(forbidden))
    assert.match(result.reason ?? '', /Forbidden Graph scope/)
  })
}

test('duplicate and whitespace scopes are normalised', () => {
  const result = checkExposureReviewScopes([' User.Read.All ', 'User.Read.All', '', '  '])
  assert.deepEqual(result.requestedScopes, ['User.Read.All'])
  assert.equal(result.ok, true)
})

test('multiple forbidden scopes are all reported', () => {
  const result = checkExposureReviewScopes(['Mail.Read', 'Files.Read.All', 'User.Read.All'])
  assert.equal(result.ok, false)
  assert.deepEqual(result.forbiddenScopesPresent.sort(), ['Files.Read.All', 'Mail.Read'].sort())
})
