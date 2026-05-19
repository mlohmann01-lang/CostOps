import test from 'node:test';import assert from 'node:assert/strict';
import { migrateCloudContracts } from '../lib/contract-migration';
test('migrateCloudContracts',()=>{ const out=migrateCloudContracts({domain:'x',recommendations:[{id:'r1',title:'t1'}],replayId:'r',lineageId:'l',sourceSystem:'s',timestamp:'2026-01-01T00:00:00.000Z'}); assert.equal(out.governance.requiresApproval,true); assert.equal(out.recommendations[0].reviewMode,'APPROVAL_REQUIRED'); });
