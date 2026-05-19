import test from 'node:test'; import assert from 'node:assert/strict'; import type { CloudProvider, CloudResourceType } from '../lib/cloud-economic-intelligence';
test('cloud economic enums compile',()=>{ const p:CloudProvider='AWS'; const r:CloudResourceType='GPU_INSTANCE'; assert.equal(p,'AWS'); assert.equal(r,'GPU_INSTANCE'); });
