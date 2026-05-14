import test from "node:test"; import assert from "node:assert/strict";
import { approvalTamperHash, checkExecutionRateLimit, redactSensitiveEvidence, validateSessionExpiry } from "../lib/security/security-controls";

test("tampered approval denied", ()=>{ const a=approvalTamperHash({x:1}); const b=approvalTamperHash({x:2}); assert.notEqual(a,b); });
test("expired session denied", ()=>{ assert.throws(()=>validateSessionExpiry(new Date(Date.now()-1000))); });
test("sensitive fields redacted", ()=>{ const r=redactSensitiveEvidence({token:"abc",nested:{secret:"s"}}); assert.equal(JSON.stringify(r).includes("abc"),false); });
test("rate limit blocks repeated execution", ()=>{ for(let i=0;i<10;i++) checkExecutionRateLimit('k',10,1000); assert.throws(()=>checkExecutionRateLimit('k',10,1000)); });
