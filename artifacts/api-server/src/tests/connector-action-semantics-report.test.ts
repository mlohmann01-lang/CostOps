import test from 'node:test'; import assert from 'node:assert/strict'; import { buildConnectorActionSemanticsReport } from '../lib/connector-action-semantics/connector-action-semantics-report';
test('report aggregates risk and manual only',()=>{ const r=buildConnectorActionSemanticsReport(); assert.ok(r.total>=23); assert.ok(r.manualOnly>=1); assert.equal(r.hasKubernetesMutation,false); });
