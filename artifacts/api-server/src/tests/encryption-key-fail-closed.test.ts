// Program 14B-R — Remediation 3 regression suite: Fallback Encryption Keys.
//
// Program 14B found that all 5 credential stores (Microsoft, ServiceNow,
// ERP, Procurement-AP, Flexera) derived their AES-256-GCM key via
// `process.env.<SOME_KEY> ?? '<hardcoded-literal>'` — a missing env var in
// production silently fell back to a literal baked into the source.
//
// The fix is resolveEncryptionKeySecret() in
// src/lib/security/encryption-key-resolution.ts: production mode with a
// missing key now throws (fails closed); non-production modes may still use
// an explicit, isolated fallback so local dev/test continues to work.
//
// These tests exercise resolveEncryptionKeySecret() directly (Scenarios 1
// and 2) and then prove the Microsoft token store — which evaluates its key
// lazily via a constructor default parameter — actually fails closed at
// construction time in production (Scenario 1, end-to-end) and that
// encryption/decryption is unaffected when a key is present (Scenario 3).

import test from "node:test";
import assert from "node:assert/strict";
import { resolveEncryptionKeySecret } from "../lib/security/encryption-key-resolution";

async function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T | Promise<T>): Promise<T> {
  const previous: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) previous[k] = process.env[k];
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("[Program 14B-R / Scenario 1] production mode + missing key throws (startup/operation rejected), never silently substitutes the fallback", async () => {
  await withEnv({ NODE_ENV: "production", SOME_TEST_ENCRYPTION_KEY: undefined }, () => {
    assert.throws(
      () => resolveEncryptionKeySecret("SOME_TEST_ENCRYPTION_KEY", "test-only-fallback"),
      /SOME_TEST_ENCRYPTION_KEY must be set in production/,
    );
  });
});

test("[Program 14B-R / Scenario 1] production mode + key present succeeds and returns the real key, not the fallback", async () => {
  await withEnv({ NODE_ENV: "production", SOME_TEST_ENCRYPTION_KEY: "real-production-secret" }, () => {
    assert.equal(resolveEncryptionKeySecret("SOME_TEST_ENCRYPTION_KEY", "test-only-fallback"), "real-production-secret");
  });
});

test("[Program 14B-R / Scenario 2] non-production mode + missing key allows a controlled, explicit fallback", async () => {
  await withEnv({ NODE_ENV: "test", SOME_TEST_ENCRYPTION_KEY: undefined }, () => {
    assert.equal(resolveEncryptionKeySecret("SOME_TEST_ENCRYPTION_KEY", "test-only-fallback"), "test-only-fallback");
  });
  await withEnv({ NODE_ENV: "development", SOME_TEST_ENCRYPTION_KEY: undefined }, () => {
    assert.equal(resolveEncryptionKeySecret("SOME_TEST_ENCRYPTION_KEY", "test-only-fallback"), "test-only-fallback");
  });
});

test("[Program 14B-R / Scenario 1, end-to-end] EncryptedMicrosoftTokenStore fails closed in production when MICROSOFT_TOKEN_ENCRYPTION_KEY is missing", async () => {
  const mod = await import("../lib/microsoft-auth/microsoft-token-store");
  await withEnv({ NODE_ENV: "production", MICROSOFT_TOKEN_ENCRYPTION_KEY: undefined }, () => {
    assert.throws(() => new mod.EncryptedMicrosoftTokenStore(), /MICROSOFT_TOKEN_ENCRYPTION_KEY must be set in production/);
  });
});

test("[Program 14B-R / Scenario 3] encryption/decryption still functions correctly when a key is present (existing credential behaviour preserved)", async () => {
  const mod = await import("../lib/microsoft-auth/microsoft-token-store");
  await withEnv({ NODE_ENV: "production", MICROSOFT_TOKEN_ENCRYPTION_KEY: "a-real-production-secret-value" }, async () => {
    // A durable backing store must be supplied explicitly in production (see the
    // regression test above and microsoft-token-store.ts) — this exercises the
    // encrypt/decrypt path itself, not the fail-closed constructor guard.
    const store = new mod.EncryptedMicrosoftTokenStore(undefined, new mod.InMemoryMicrosoftCredentialStore());
    const connection = await store.store(
      { tenantId: "t1", userPrincipalName: "user@tenant.com", scopes: ["read"] } as any,
      { accessToken: "secret-access-token", refreshToken: "secret-refresh-token", expiresAt: new Date(Date.now() + 3600_000).toISOString() } as any,
    );
    const tokens = await store.getTokenSet("t1", connection.credentialRef);
    assert.equal(tokens?.accessToken, "secret-access-token", "decryption with the real key must recover the original plaintext");
  });
});

test("[Program 14B-R regression] no production credential store silently falls back to its hardcoded literal anymore", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const files = [
    "src/lib/microsoft-auth/microsoft-token-store.ts",
    "src/lib/production-connectors/flexera/flexera-auth.ts",
    "src/lib/production-connectors/servicenow/servicenow-auth.ts",
    "src/lib/production-connectors/procurement-ap/procurement-ap-auth.ts",
    "src/lib/production-connectors/erp/erp-auth.ts",
  ];
  for (const f of files) {
    const source = fs.readFileSync(path.resolve(process.cwd(), f), "utf8");
    assert.ok(!/process\.env\.\w+_KEY\s*\?\?\s*['"]/.test(source), `${f} must not silently fall back to a hardcoded key literal via ??`);
    assert.ok(/resolveEncryptionKeySecret\(/.test(source), `${f} must call resolveEncryptionKeySecret()`);
  }
});
