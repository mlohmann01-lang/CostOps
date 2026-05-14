import test from "node:test"; import assert from "node:assert/strict";
import { enforceCooldown, suspiciousApproval } from "../lib/security/runtime-controls";

test("execution cooldown window", ()=>{ enforceCooldown('x',1000); assert.throws(()=>enforceCooldown('x',1000)); });
test("suspicious approval detection", ()=>{ assert.equal(String(suspiciousApproval('actor',21)).startsWith('SUSPICIOUS_APPROVAL'), true); });
