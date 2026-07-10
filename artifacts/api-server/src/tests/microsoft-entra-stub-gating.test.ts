import test from "node:test";
import assert from "node:assert/strict";
import { exchangeCodeForClaims } from "../lib/auth/providers/microsoft-entra.js";

function withNodeEnv<T>(value: string | undefined, fn: () => T): T {
  const prior = process.env.NODE_ENV;
  if (value === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = value;
  try {
    return fn();
  } finally {
    if (prior === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prior;
  }
}

test("refuses to hand back mock/unverified Entra claims in production", async () => {
  await withNodeEnv("production", async () => {
    await assert.rejects(() => exchangeCodeForClaims("some-code"), /ENTRA_TOKEN_EXCHANGE_NOT_IMPLEMENTED/);
  });
});

test("still requires a code even in production (fails on the right check first)", async () => {
  await withNodeEnv("production", async () => {
    await assert.rejects(() => exchangeCodeForClaims(""), /CODE_REQUIRED/);
  });
});

test("outside production, returns clearly-labelled placeholder claims (not silently authentic-looking)", async () => {
  await withNodeEnv("test", async () => {
    const claims = await exchangeCodeForClaims("some-code");
    assert.equal(claims.sub, "dev-entra-user");
    assert.equal(claims.tenantId, "dev-tenant");
  });
});
