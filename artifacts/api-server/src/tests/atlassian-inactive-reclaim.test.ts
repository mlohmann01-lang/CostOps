import test from 'node:test'; import assert from 'node:assert/strict';
import { atlassianInactiveJiraReclaim } from '../lib/playbooks/atlassian-phase-a-playbooks';
test('inactive reclaim generated correctly',()=>{ const r=atlassianInactiveJiraReclaim.evaluate({email:'u',displayName:'u',productType:'JIRA',assignedLicenses:['JIRA'],inactiveDays:100,cost:20,trustBand:'HIGH'}); assert.equal(r.matched,true); });
