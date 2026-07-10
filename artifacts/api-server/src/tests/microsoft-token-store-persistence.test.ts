import test from "node:test";
import assert from "node:assert/strict";
import { EncryptedMicrosoftTokenStore, InMemoryMicrosoftCredentialStore } from "../lib/microsoft-auth/microsoft-token-store";

function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => T): T {
  const prior: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) prior[key] = process.env[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("refuses to construct with the default in-memory backing store in production", () => {
  withEnv({ NODE_ENV: "production", MICROSOFT_TOKEN_ENCRYPTION_KEY: "y".repeat(32) }, () => {
    assert.throws(() => new EncryptedMicrosoftTokenStore(), /FAIL_CLOSED.*durable backing store/);
  });
});

test("refuses to construct with an insecure default encryption key in production, even with a backing store supplied", () => {
  withEnv({ NODE_ENV: "production", MICROSOFT_TOKEN_ENCRYPTION_KEY: undefined }, () => {
    assert.throws(
      () => new EncryptedMicrosoftTokenStore(undefined, new InMemoryMicrosoftCredentialStore()),
      /MICROSOFT_TOKEN_ENCRYPTION_KEY/,
    );
  });
});

test("allows the in-memory store outside production for local dev/tests", () => {
  withEnv({ NODE_ENV: "test" }, () => {
    assert.doesNotThrow(() => new EncryptedMicrosoftTokenStore("test-secret"));
  });
});

test("credentials round-trip through an injected backing store without ever storing tokens in the clear", async () => {
  const backing = new InMemoryMicrosoftCredentialStore();
  const store = new EncryptedMicrosoftTokenStore("test-secret", backing);
  const connection = await store.store(
    { id: "conn-1", tenantId: "t1", connectorKey: "M365", authFlow: "CLIENT_CREDENTIALS", grantedScopes: ["User.Read.All"], status: "CONNECTED" },
    { accessToken: "super-secret-access-token", expiresAt: new Date(Date.now() + 3600_000).toISOString(), scopes: ["User.Read.All"] },
  );
  const raw = await backing.get("t1", connection.credentialRef);
  assert.ok(raw);
  assert.doesNotMatch(raw!.encryptedTokenPayload, /super-secret-access-token/);
  const decrypted = await store.getTokenSet("t1", connection.credentialRef);
  assert.equal(decrypted?.accessToken, "super-secret-access-token");
});

test("a credential belonging to a different tenant is never returned, even with the correct credentialRef", async () => {
  const backing = new InMemoryMicrosoftCredentialStore();
  const store = new EncryptedMicrosoftTokenStore("test-secret", backing);
  const connection = await store.store(
    { id: "conn-2", tenantId: "tenant-a", connectorKey: "M365", authFlow: "CLIENT_CREDENTIALS", grantedScopes: ["User.Read.All"], status: "CONNECTED" },
    { accessToken: "tenant-a-token", expiresAt: new Date(Date.now() + 3600_000).toISOString(), scopes: ["User.Read.All"] },
  );
  const crossTenantRead = await store.getTokenSet("tenant-b", connection.credentialRef);
  assert.equal(crossTenantRead, undefined);
});
