import test from 'node:test'; import assert from 'node:assert/strict';
import { atlassianAdminAccessReview, atlassianGroupAssignmentReview } from '../lib/playbooks/atlassian-phase-a-playbooks';
test('admin escalated/excluded and group ambiguity handled',()=>{ const a=atlassianAdminAccessReview.evaluate({email:'u',displayName:'u',productType:'JIRA',isOrgAdmin:true,inactiveDays:40}); const g=atlassianGroupAssignmentReview.evaluate({email:'u',displayName:'u',productType:'JIRA',groupAmbiguous:true}); assert.equal(a.matched,true); assert.equal(g.matched,true); });
