/**
 * Tests for Microsoft Entra real authorization code exchange.
 *
 * Uses Node's built-in test runner and mocks fetch globally to avoid
 * any real HTTP calls to login.microsoftonline.com.
 */

import test from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Helpers — build minimal JWT-shaped id_token strings for tests
// ---------------------------------------------------------------------------

function buildFakeIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = "fakesig";
  return `${header}.${body}.${sig}`;
}

const FAKE_PAYLOAD = {
  sub: "user-sub-123",
  oid: "oid-abc",
  tid: "tid-xyz",
  email: "alice@contoso.com",
  preferred_username: "alice@contoso.com",
  name: "Alice Smith",
  scp: "openid profile email offline_access",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const FAKE_ID_TOKEN = buildFakeIdToken(FAKE_PAYLOAD);

function buildSuccessResponse(): EntraTokenApiResponse {
  return {
    access_token: "ACCESS_TOKEN_REDACTED",
    refresh_token: "REFRESH_TOKEN_REDACTED",
    id_token: FAKE_ID_TOKEN,
    expires_in: 3600,
    token_type: "Bearer",
  };
}

interface EntraTokenApiResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

// ---------------------------------------------------------------------------
// Mock fetch helper — replaces global fetch for the duration of a test
// ---------------------------------------------------------------------------

type MockFetchFn = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

function installMockFetch(fn: MockFetchFn): void {
  (global as unknown as { fetch: MockFetchFn }).fetch = fn;
}

function mockFetchReturning(body: object, status = 200): MockFetchFn {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function setEntraEnv(overrides: Record<string, string | undefined> = {}): void {
  process.env.ENTRA_CLIENT_ID = overrides.ENTRA_CLIENT_ID ?? "test-client-id";
  process.env.ENTRA_CLIENT_SECRET = overrides.ENTRA_CLIENT_SECRET ?? "test-client-secret";
  process.env.ENTRA_TENANT_ID = overrides.ENTRA_TENANT_ID ?? "test-tenant-id";
  process.env.ENTRA_REDIRECT_URI = overrides.ENTRA_REDIRECT_URI ?? "https://app.example.com/callback";
}

function clearEntraEnv(): void {
  delete process.env.ENTRA_CLIENT_ID;
  delete process.env.ENTRA_CLIENT_SECRET;
  delete process.env.ENTRA_TENANT_ID;
  delete process.env.ENTRA_REDIRECT_URI;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("exchangeCodeForClaims: throws CODE_REQUIRED when code is empty", async () => {
  const { exchangeCodeForClaims } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );
  await assert.rejects(() => exchangeCodeForClaims(""), /CODE_REQUIRED/);
});

test("exchangeCodeForClaims: throws ENTRA_CONFIG_INCOMPLETE when env vars are missing", async () => {
  clearEntraEnv();

  const { exchangeCodeForClaims } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  let caught: Error | undefined;
  try {
    await exchangeCodeForClaims("some-code");
  } catch (e) {
    caught = e as Error;
  }

  assert.ok(caught, "Expected an error to be thrown");
  assert.equal(caught.message, "ENTRA_CONFIG_INCOMPLETE");
  const missing = (caught as Error & { missing?: string[] }).missing;
  assert.ok(Array.isArray(missing), "Expected missing array on the error");
  assert.ok(missing.includes("ENTRA_CLIENT_ID"), "Should list ENTRA_CLIENT_ID");
  assert.ok(missing.includes("ENTRA_CLIENT_SECRET"), "Should list ENTRA_CLIENT_SECRET");
  assert.ok(missing.includes("ENTRA_TENANT_ID"), "Should list ENTRA_TENANT_ID");
  assert.ok(missing.includes("ENTRA_REDIRECT_URI"), "Should list ENTRA_REDIRECT_URI");
});

test("exchangeCodeForClaims: throws ENTRA_CONFIG_INCOMPLETE listing only the missing vars", async () => {
  // Set only some vars
  process.env.ENTRA_CLIENT_ID = "test-client-id";
  process.env.ENTRA_TENANT_ID = "test-tenant-id";
  delete process.env.ENTRA_CLIENT_SECRET;
  delete process.env.ENTRA_REDIRECT_URI;

  const { exchangeCodeForClaims } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  let caught: Error | undefined;
  try {
    await exchangeCodeForClaims("some-code");
  } catch (e) {
    caught = e as Error;
  }

  assert.ok(caught, "Expected an error");
  assert.equal(caught.message, "ENTRA_CONFIG_INCOMPLETE");
  const missing = (caught as Error & { missing?: string[] }).missing;
  assert.ok(missing?.includes("ENTRA_CLIENT_SECRET"));
  assert.ok(missing?.includes("ENTRA_REDIRECT_URI"));
  assert.ok(!missing?.includes("ENTRA_CLIENT_ID"), "CLIENT_ID is set, should not be in missing");
  assert.ok(!missing?.includes("ENTRA_TENANT_ID"), "TENANT_ID is set, should not be in missing");

  // cleanup
  clearEntraEnv();
});

test("exchangeCodeForClaims: successful exchange returns user claims", async () => {
  setEntraEnv();
  installMockFetch(mockFetchReturning(buildSuccessResponse()));

  const { exchangeCodeForClaims } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  const claims = await exchangeCodeForClaims("valid-auth-code");

  assert.equal(claims.sub, FAKE_PAYLOAD.sub);
  assert.equal(claims.email, FAKE_PAYLOAD.email);
  assert.equal(claims.name, FAKE_PAYLOAD.name);
  assert.equal(claims.oid, FAKE_PAYLOAD.oid);
  assert.equal(claims.tid, FAKE_PAYLOAD.tid);
  assert.ok(typeof claims.expiresAt === "number", "expiresAt should be a number");
});

test("exchangeCodeForClaims: response NEVER contains access_token or refresh_token", async () => {
  setEntraEnv();
  installMockFetch(mockFetchReturning(buildSuccessResponse()));

  const { exchangeCodeForClaims } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  const claims = await exchangeCodeForClaims("valid-auth-code");
  const claimsJson = JSON.stringify(claims);

  assert.ok(
    !claimsJson.includes("ACCESS_TOKEN_REDACTED"),
    "access_token must not appear in returned claims"
  );
  assert.ok(
    !claimsJson.includes("REFRESH_TOKEN_REDACTED"),
    "refresh_token must not appear in returned claims"
  );
});

test("exchangeCodeForClaims: Entra error response throws structured error", async () => {
  setEntraEnv();
  installMockFetch(
    mockFetchReturning(
      {
        error: "invalid_grant",
        error_description: "AADSTS70011: The provided value for the input parameter 'code' is not valid.",
      },
      400
    )
  );

  const { exchangeCodeForClaims } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  await assert.rejects(
    () => exchangeCodeForClaims("bad-code"),
    /AADSTS70011|invalid_grant/
  );
});

test("refreshEntraToken: throws REFRESH_TOKEN_REQUIRED when token is empty", async () => {
  setEntraEnv();
  const { refreshEntraToken } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );
  await assert.rejects(() => refreshEntraToken(""), /REFRESH_TOKEN_REQUIRED/);
});

test("refreshEntraToken: successful refresh returns new claims", async () => {
  setEntraEnv();

  const refreshedPayload = {
    ...FAKE_PAYLOAD,
    exp: Math.floor(Date.now() / 1000) + 7200, // extended expiry
  };
  const refreshedIdToken = buildFakeIdToken(refreshedPayload);

  installMockFetch(
    mockFetchReturning({
      access_token: "NEW_ACCESS_TOKEN",
      refresh_token: "NEW_REFRESH_TOKEN",
      id_token: refreshedIdToken,
      expires_in: 7200,
      token_type: "Bearer",
    })
  );

  const { refreshEntraToken } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  const claims = await refreshEntraToken("some-old-refresh-token");

  assert.equal(claims.sub, FAKE_PAYLOAD.sub);
  assert.ok(
    typeof claims.expiresAt === "number" && claims.expiresAt > Math.floor(Date.now() / 1000),
    "expiresAt should be in the future"
  );
});

test("refreshEntraToken: response NEVER contains raw tokens", async () => {
  setEntraEnv();

  installMockFetch(
    mockFetchReturning({
      access_token: "SECRET_ACCESS_TOKEN_XYZ",
      refresh_token: "SECRET_REFRESH_TOKEN_XYZ",
      id_token: buildFakeIdToken(FAKE_PAYLOAD),
      expires_in: 3600,
      token_type: "Bearer",
    })
  );

  const { refreshEntraToken } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  const claims = await refreshEntraToken("some-refresh-token");
  const claimsJson = JSON.stringify(claims);

  assert.ok(!claimsJson.includes("SECRET_ACCESS_TOKEN_XYZ"), "access_token must not leak");
  assert.ok(!claimsJson.includes("SECRET_REFRESH_TOKEN_XYZ"), "refresh_token must not leak");
});

test("getEntraReadiness: returns UNAVAILABLE when no env vars are set", async () => {
  clearEntraEnv();
  const { getEntraReadiness } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );
  const readiness = getEntraReadiness();
  assert.equal(readiness, "UNAVAILABLE");
});

test("getEntraReadiness: returns DEGRADED when some env vars are set", async () => {
  clearEntraEnv();
  process.env.ENTRA_CLIENT_ID = "partial";

  const { getEntraReadiness } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );
  const readiness = getEntraReadiness();
  assert.equal(readiness, "DEGRADED");

  delete process.env.ENTRA_CLIENT_ID;
});

test("getEntraReadiness: returns READY when all env vars are set", async () => {
  setEntraEnv();
  const { getEntraReadiness } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );
  const readiness = getEntraReadiness();
  assert.equal(readiness, "READY");
  clearEntraEnv();
});

test("token expiry is tracked and retrievable", async () => {
  setEntraEnv();
  installMockFetch(mockFetchReturning(buildSuccessResponse()));

  const { exchangeCodeForClaims, getEntraTokenEntry } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  const claims = await exchangeCodeForClaims("code-for-expiry-test");
  assert.ok(claims.sub, "Should have a sub claim");

  const entry = getEntraTokenEntry(claims.sub);
  assert.ok(entry, "Token entry should be stored");
  assert.ok(typeof entry.expiresAt === "number", "Entry should have expiresAt");
  assert.ok(entry.expiresAt > Math.floor(Date.now() / 1000), "Token should not be expired");

  // Verify the raw refresh token is NOT exposed via getEntraTokenEntry
  assert.ok(
    !("refreshTokenRef" in entry),
    "refreshTokenRef must be redacted from the safe entry"
  );
});

test("buildEntraLoginUrl: throws ENTRA_CONFIG_INCOMPLETE when config is missing", async () => {
  clearEntraEnv();
  const { buildEntraLoginUrl } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );
  assert.throws(() => buildEntraLoginUrl("some-state"), /ENTRA_CONFIG_INCOMPLETE/);
});

test("buildEntraLoginUrl: returns URL with correct params when config is present", async () => {
  setEntraEnv();
  const { buildEntraLoginUrl } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );
  const url = buildEntraLoginUrl("csrf-state-value");

  assert.ok(url.includes("login.microsoftonline.com"), "URL should use the Entra endpoint");
  assert.ok(url.includes("oauth2/v2.0/authorize"), "URL should use the authorize endpoint");
  assert.ok(url.includes("response_type=code"), "URL should request code flow");
  assert.ok(url.includes("csrf-state-value"), "URL should include the state param");
  assert.ok(url.includes("openid"), "URL should request openid scope");

  clearEntraEnv();
});

test("ENTRA_CLIENT_SECRET never appears in any log-safe structure", async () => {
  // This is a static analysis guard: the secret is only used in the POST body
  // and never included in error objects or claims returned to callers.
  // We verify by checking that the error thrown for bad codes doesn't embed secrets.

  setEntraEnv();
  installMockFetch(
    mockFetchReturning(
      { error: "invalid_grant", error_description: "Code expired" },
      400
    )
  );

  const { exchangeCodeForClaims } = await import(
    "../lib/auth/providers/microsoft-entra.js"
  );

  let errorMessage = "";
  try {
    await exchangeCodeForClaims("bad-code");
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
  }

  assert.ok(!errorMessage.includes("test-client-secret"), "client_secret must not appear in errors");
});
