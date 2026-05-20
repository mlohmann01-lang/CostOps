import test from 'node:test';import assert from 'node:assert/strict';import { getConnectorRateLimit } from '../lib/connector-transaction-realism/connector-rate-limit-model';
test('rate limits differ by provider',()=>{ assert.equal(getConnectorRateLimit('AWS'),10); assert.equal(getConnectorRateLimit('SERVICENOW'),5); assert.equal(getConnectorRateLimit('UNKNOWN'),3);});
