import test from "node:test"; import assert from "node:assert/strict";
import { OperationalEntityGraphService } from "../lib/enterprise-graph/operational-entity-graph-service";

test("deterministic correlation hash", ()=>{ const s=new OperationalEntityGraphService(); const a=(s as any).identityConfidence({upn:'a@b.com',email:'a@b.com'}); const b=(s as any).identityConfidence({upn:'a@b.com',email:'a@b.com'}); assert.equal(a,b); });
