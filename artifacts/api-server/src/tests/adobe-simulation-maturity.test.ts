import test from 'node:test'; import assert from 'node:assert/strict';
import { simulateM365LifecycleAwareSavings } from '../lib/simulations/policy-simulation-service';
test('suppressed excluded and needs evidence in review-only bucket',()=>{ const s=simulateM365LifecycleAwareSavings([{lifecycleState:'SUPPRESSED',projectedMonthlySavings:10},{lifecycleState:'NEEDS_EVIDENCE',projectedMonthlySavings:20},{lifecycleState:'READY_FOR_REVIEW',projectedMonthlySavings:30}]); assert.equal(s.actionableSavings,30); assert.equal(s.reviewOnlySavings,20); });
