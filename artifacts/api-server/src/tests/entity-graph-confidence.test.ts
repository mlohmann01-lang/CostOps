import test from "node:test"; import assert from "node:assert/strict";
import { OperationalEntityGraphService } from "../lib/enterprise-graph/operational-entity-graph-service";
test("confidence scoring bands", ()=>{ const s:any=new OperationalEntityGraphService(); assert.equal(s.identityConfidence({upn:'u',email:'u'}),100); assert.ok(s.identityConfidence({upn:'u'})>=80); assert.ok(s.identityConfidence({})<50);});
