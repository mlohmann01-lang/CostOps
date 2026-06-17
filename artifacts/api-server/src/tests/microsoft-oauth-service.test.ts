import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EncryptedMicrosoftTokenStore, MicrosoftOAuthService } from "../lib/microsoft-auth";
describe("MicrosoftOAuthService", () => {
  it("generates stateful URLs, rejects invalid state, stores opaque encrypted refs, and hides tokens", async () => {
    const store = new EncryptedMicrosoftTokenStore("test-secret");
    const service = new MicrosoftOAuthService({ clientId: "client", redirectUri: "http://cb", tokenStore: store, fetchImpl: async () => Response.json({ access_token: "access", refresh_token: "refresh", expires_in: 3600, scope: "User.Read.All" }) });
    const url = service.generateAuthorizationUrl({ tenantId: "t1", connectorKey: "M365", scopes: ["User.Read.All"], state: "state-1" });
    assert.match(url.authorizationUrl, /state=state-1/);
    await assert.rejects(() => service.exchangeAuthorizationCode({ tenantId: "t1", connectorKey: "M365", code: "c", state: "bad", scopes: [] }), /Invalid OAuth state/);
    const conn = await service.exchangeAuthorizationCode({ tenantId: "t1", connectorKey: "M365", code: "c", state: "state-1", scopes: ["User.Read.All"] });
    assert.ok(conn.credentialRef.startsWith("mscred_")); assert.equal((conn as any).accessToken, undefined);
    const encrypted = await store.inspectEncryptedRecord(conn.credentialRef); assert.ok(encrypted?.encryptedTokenPayload); assert.doesNotMatch(encrypted!.encryptedTokenPayload, /access|refresh/);
  });
});
