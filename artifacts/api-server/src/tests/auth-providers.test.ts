import test from "node:test"; import assert from "node:assert/strict";
import { mapClaimsToRole } from "../lib/auth/providers/token-claims"; import { validateJwtToken } from "../lib/auth/providers/jwt-validation"; import { issueSessionToken, hashSessionToken } from "../lib/auth/providers/session-manager";

test("auth provider claims mapping", ()=>{ assert.equal(mapClaimsToRole(["operator"]),"OPERATOR"); });
test("session issuance/hash", ()=>{ const t=issueSessionToken(); assert.equal(typeof hashSessionToken(t),"string"); });
test("jwt validation requires token", ()=>{ assert.throws(()=>validateJwtToken("")); });
