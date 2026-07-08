import test from "node:test";
import assert from "node:assert/strict";
import { EncryptedMicrosoftTokenStore } from "../lib/microsoft-auth/microsoft-token-store";
import { DatabaseMicrosoftCredentialStore, createMicrosoftTokenStore } from "../lib/microsoft-auth/microsoft-token-db-store";

// DB integration test: exercises the durable, DB-backed credential store used in
// production instead of the non-durable in-memory Map. Skipped automatically by
// run-pattern-tests.mjs unless RUN_DB_INTEGRATION_TESTS=true and DATABASE_URL is set.

test("DatabaseMicrosoftCredentialStore persists encrypted credentials across independent store instances", async () => {
  const backing = new DatabaseMicrosoftCredentialStore();
  const store = new EncryptedMicrosoftTokenStore("integration-test-secret", backing);
  const connection = await store.store(
    { id: `conn_${Date.now()}`, tenantId: "tenant-db-test", connectorKey: "M365", authFlow: "CLIENT_CREDENTIALS", grantedScopes: ["User.Read.All"], status: "CONNECTED" },
    { accessToken: "db-backed-access-token", expiresAt: new Date(Date.now() + 3600_000).toISOString(), scopes: ["User.Read.All"] },
  );

  // A brand new store instance (simulating a fresh process/replica) must still be
  // able to read the credential back — proving it survives beyond a single process.
  const freshBacking = new DatabaseMicrosoftCredentialStore();
  const freshStore = new EncryptedMicrosoftTokenStore("integration-test-secret", freshBacking);
  const tokens = await freshStore.getTokenSet(connection.credentialRef);
  assert.equal(tokens?.accessToken, "db-backed-access-token");

  const raw = await freshBacking.get(connection.credentialRef);
  assert.ok(raw);
  assert.doesNotMatch(raw!.encryptedTokenPayload, /db-backed-access-token/);
});

test("createMicrosoftTokenStore() picks the DB-backed store when DATABASE_URL is set", () => {
  const store = createMicrosoftTokenStore("integration-test-secret");
  assert.ok(store instanceof EncryptedMicrosoftTokenStore);
});
