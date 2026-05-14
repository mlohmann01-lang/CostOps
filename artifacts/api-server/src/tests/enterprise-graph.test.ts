import test from "node:test"; import assert from "node:assert/strict";
import { resolveEntityKey } from "../lib/enterprise-graph/entity-resolver"; import { detectGraphConflicts } from "../lib/enterprise-graph/conflict-detector";

test("enterprise graph key resolver", ()=>{ assert.equal(resolveEntityKey('USER','A'),'user:a'); });
test("graph conflict detection", ()=>{ const c=detectGraphConflicts([{entityKey:'u',value:'a'},{entityKey:'u',value:'b'}]); assert.equal(c.length,1); });
