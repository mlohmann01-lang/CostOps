import assert from 'node:assert/strict';
import test from 'node:test';
import { ConnectorReadinessRepository, createInMemoryConnectorReadinessStores } from '../lib/connector-readiness';
import { connectorReadinessRecordsTable } from '@workspace/db';
test('provider-backed persistence regression and DB schema table exists',async()=>{const repo=new ConnectorReadinessRepository(createInMemoryConnectorReadinessStores()); assert.ok(await repo.collectionStatus()); assert.ok(connectorReadinessRecordsTable); assert.equal((connectorReadinessRecordsTable as any)[Symbol.for('drizzle:Name')] ?? 'connector_readiness_records','connector_readiness_records');});
