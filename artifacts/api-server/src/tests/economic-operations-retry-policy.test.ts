import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyError, computeRetryDecision, evaluateRetry, type RetryPolicyConfig } from '../lib/economic-operations-retry-policy';

const config: RetryPolicyConfig = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 10000, jitterFactor: 0 };

test('rate limit error classifies as RETRYABLE_RATE_LIMIT', () => {
  const cat = classifyError({ status: 429 });
  assert.equal(cat, 'RETRYABLE_RATE_LIMIT');
});

test('401 error classifies as NON_RETRYABLE_AUTH', () => {
  const cat = classifyError({ status: 401 });
  assert.equal(cat, 'NON_RETRYABLE_AUTH');
});

test('403 scope error classifies as NON_RETRYABLE_SCOPE', () => {
  const cat = classifyError({ status: 403 });
  assert.equal(cat, 'NON_RETRYABLE_SCOPE');
});

test('5xx error classifies as RETRYABLE_PROVIDER_5XX', () => {
  const cat = classifyError({ status: 503 });
  assert.equal(cat, 'RETRYABLE_PROVIDER_5XX');
});

test('network error classifies as RETRYABLE_NETWORK', () => {
  const cat = classifyError({ code: 'ECONNRESET' });
  assert.equal(cat, 'RETRYABLE_NETWORK');
});

test('timeout error classifies as RETRYABLE_TIMEOUT', () => {
  const cat = classifyError({ code: 'TIMEOUT' });
  assert.equal(cat, 'RETRYABLE_TIMEOUT');
});

test('non-retryable auth does not retry', () => {
  const d = computeRetryDecision('NON_RETRYABLE_AUTH', 0, config);
  assert.equal(d.shouldRetry, false);
  assert.equal(d.deadLetter, true);
});

test('non-retryable scope does not retry', () => {
  const d = computeRetryDecision('NON_RETRYABLE_SCOPE', 0, config);
  assert.equal(d.shouldRetry, false);
  assert.equal(d.deadLetter, true);
});

test('non-retryable policy does not retry', () => {
  const d = computeRetryDecision('NON_RETRYABLE_POLICY', 0, config);
  assert.equal(d.shouldRetry, false);
  assert.equal(d.deadLetter, true);
});

test('non-retryable tenant mode does not retry', () => {
  const d = computeRetryDecision('NON_RETRYABLE_TENANT_MODE', 0, config);
  assert.equal(d.shouldRetry, false);
  assert.equal(d.deadLetter, true);
});

test('retryable error retries on attempt 0', () => {
  const d = computeRetryDecision('RETRYABLE_RATE_LIMIT', 0, config);
  assert.equal(d.shouldRetry, true);
  assert.equal(d.deadLetter, false);
  assert.ok(d.delayMs >= 100);
});

test('retryable error exhausted after max attempts', () => {
  const d = computeRetryDecision('RETRYABLE_NETWORK', 3, config);
  assert.equal(d.shouldRetry, false);
  assert.equal(d.deadLetter, true);
});

test('retry-after header overrides exponential backoff', () => {
  const d = computeRetryDecision('RETRYABLE_RATE_LIMIT', 0, config, 5000);
  assert.equal(d.shouldRetry, true);
  assert.equal(d.delayMs, 5000);
});

test('exponential backoff grows with attempt number', () => {
  const d0 = computeRetryDecision('RETRYABLE_PROVIDER_5XX', 0, config);
  const d1 = computeRetryDecision('RETRYABLE_PROVIDER_5XX', 1, config);
  assert.ok(d1.delayMs > d0.delayMs);
});

test('evaluateRetry classifies and computes correctly', () => {
  const d = evaluateRetry({ status: 429 }, 0, config);
  assert.equal(d.category, 'RETRYABLE_RATE_LIMIT');
  assert.equal(d.shouldRetry, true);
});

test('evaluateRetry non-retryable from error object', () => {
  const d = evaluateRetry({ status: 401, message: 'Unauthorized' }, 0, config);
  assert.equal(d.shouldRetry, false);
  assert.equal(d.deadLetter, true);
});
