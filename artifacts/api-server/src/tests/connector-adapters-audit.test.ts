import assert from 'node:assert/strict';
import test from 'node:test';
import { CONNECTOR_IMPLEMENTATION_ADAPTERS_READY, runConnectorImplementationAdaptersAudit } from '../lib/connector-adapters';
import { readSourcePath } from './test-harness-paths';

test('CONNECTOR_IMPLEMENTATION_ADAPTERS_READY audit returns PASS', async () => { const audit = await runConnectorImplementationAdaptersAudit(); assert.equal(audit.checkKey, CONNECTOR_IMPLEMENTATION_ADAPTERS_READY); assert.equal(audit.status, 'PASS'); });

test('connector adapter routes are mounted', () => { const routeIndex = readSourcePath('routes', 'index.ts'); assert.match(routeIndex, /connectorAdaptersRouter/); assert.match(routeIndex, /\/connector-adapters/); });
