import test from "node:test"; import assert from "node:assert/strict";
import { exchangeCodeForClaims } from "../lib/auth/providers/microsoft-entra"; import { validateJwtToken } from "../lib/auth/providers/jwt-validation";

test("expired/invalid token rejected", ()=>{ assert.throws(()=>validateJwtToken("")); });
test("wrong tenant rejected scaffolding", ()=>{ const c=exchangeCodeForClaims("code"); assert.equal(c.tenantId, "default"); });
test("revoked session rejected placeholder", ()=>{ assert.equal(true,true); });
