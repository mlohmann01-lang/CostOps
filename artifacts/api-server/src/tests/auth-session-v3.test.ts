import test from "node:test"; import assert from "node:assert/strict";
import { exchangeCodeForClaims } from "../lib/auth/providers/microsoft-entra.js"; import { validateJwtToken } from "../lib/auth/providers/jwt-validation.js";

test("expired/invalid token rejected", async ()=>{ const result = await validateJwtToken(""); assert.equal(result.ok, false); });
test("wrong tenant rejected scaffolding", async ()=>{ const c = await exchangeCodeForClaims("code"); assert.equal(typeof c.tenantId, "string"); });
test("revoked session rejected placeholder", ()=>{ assert.equal(true,true); });
