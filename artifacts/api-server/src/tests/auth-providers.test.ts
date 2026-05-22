import test from "node:test"; import assert from "node:assert/strict";
import { mapClaimsToRole } from "../lib/auth/providers/token-claims.js"; import { validateJwtToken } from "../lib/auth/providers/jwt-validation.js"; import { issueSessionToken, hashSessionToken } from "../lib/auth/providers/session-manager.js";

test("auth provider claims mapping", ()=>{ assert.equal(mapClaimsToRole(["operator"]),"OPERATOR"); });
test("session issuance/hash", ()=>{ const t=issueSessionToken(); assert.equal(typeof hashSessionToken(t),"string"); });
test("jwt validation requires token", async ()=>{ const result = await validateJwtToken(""); assert.equal(result.ok, false); assert.equal((result as any).error, "TOKEN_REQUIRED"); });
