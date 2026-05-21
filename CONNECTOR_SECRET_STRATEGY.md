# Connector Secret Strategy

## Principles

1. **No secrets in code or config files** — all connector credentials stored in vault
2. **No secrets in logs** — structured telemetry masks all credential fields
3. **No secrets in test fixtures** — tests use `MOCK_CONNECTOR` mode
4. **No secrets in frontend** — frontend never receives connector credentials
5. **Least privilege** — each connector uses minimum required scopes
6. **Rotation-ready** — all secrets can be rotated without service restart

## Secret Inventory

| Secret | Used By | Rotation Period | Vault Path |
|---|---|---|---|
| `AZURE_CLIENT_SECRET` | M365 Graph connector | 12 months | `secrets/m365/client-secret` |
| `SERVICENOW_CLIENT_SECRET` | ServiceNow OAuth | 12 months | `secrets/servicenow/oauth-secret` |
| `FLEXERA_API_KEY` | Flexera connector | 6 months | `secrets/flexera/api-key` |
| `JWT_SECRET` | API auth | 90 days | `secrets/jwt/signing-secret` |
| `DATABASE_URL` | All services | On credential rotation | `secrets/db/connection-string` |

## Environment Variable Handling

Secrets are injected as environment variables at runtime. They are NEVER:
- Committed to git (`.env` files are `.gitignored`)
- Logged by the application (secret masking is active)
- Returned in API responses
- Stored in the database
- Passed to the frontend

### Vault Integration Pattern

```typescript
// Retrieve secrets from vault at startup
const clientSecret = await vaultClient.getSecret('secrets/m365/client-secret');
process.env.AZURE_CLIENT_SECRET = clientSecret.value;
```

If vault is unavailable at startup, the service should fail-closed (refuse to start).

## Secret Masking in Logs

The platform's `secret-masking.ts` and `secret-redaction.ts` services ensure that
if a secret value appears in a log event, it is replaced with `[REDACTED]`.

Keys masked by default:
- `clientSecret`, `client_secret`, `AZURE_CLIENT_SECRET`
- `apiKey`, `api_key`, `FLEXERA_API_KEY`
- `password`, `secret`, `token`, `key`
- `DATABASE_URL` (connection strings contain credentials)
- `JWT_SECRET`

Do NOT log raw `process.env` objects. Always use the structured telemetry service.

## Rotation Procedure

### M365 Client Secret Rotation

1. Create new secret in App Registration (keep old secret active)
2. Add new secret value to vault: `vault kv put secrets/m365/client-secret value=<new>`
3. Restart API server with new secret (rolling restart, old secret still valid)
4. Verify connector health: `GET /health/dependencies`
5. Delete old secret from App Registration after 24h confirmation window
6. Update rotation date in `CONNECTOR_SECRET_STRATEGY.md`

### ServiceNow OAuth Secret Rotation

1. Generate new OAuth client secret in ServiceNow
2. Update vault: `vault kv put secrets/servicenow/oauth-secret value=<new>`
3. Rolling restart API server
4. Verify: `SERVICENOW_MODE=LIVE curl <instance>/api/now/v1/table/change_request?sysparm_limit=1`
5. Revoke old secret

### Flexera API Key Rotation

1. Generate new API key in Flexera portal
2. Update vault: `vault kv put secrets/flexera/api-key value=<new>`
3. Rolling restart API server
4. Verify Flexera connector readiness

### JWT Secret Rotation

JWT secret rotation invalidates all active sessions. Coordinate with operations:

1. Generate new high-entropy secret: `openssl rand -base64 48`
2. Update vault: `vault kv put secrets/jwt/signing-secret value=<new>`
3. Plan maintenance window (all active sessions will expire)
4. Rolling restart all API server instances
5. Communicate expected session disruption to users

## Mock Connector Mode (Non-Production)

For development and testing, set connector mode to `MOCK_CONNECTOR`:

```bash
M365_GRAPH_MODE=MOCK_CONNECTOR         # Use mock Graph client
SERVICENOW_MODE=MOCK_CONNECTOR         # Use mock ServiceNow
FLEXERA_MODE=MOCK_CONNECTOR            # Use mock Flexera
```

In mock mode:
- No real credentials are required
- All connector responses are deterministic fixtures
- Live mutations are impossible (the mock does not have credentials)
- Tests run without any external dependencies

**Mock mode must never be enabled in production.** The production config validator
will warn if mock modes are detected in a production environment.

## Connector Health Monitoring

The platform continuously monitors connector auth health via `ConnectorHealthState`.
States that indicate credential problems:

| State | Meaning | Alert? | Action |
|---|---|---|---|
| `AUTH_FAILED` | Credentials rejected by provider | YES — HIGH | Rotate secret immediately |
| `MISSING_SCOPES` | Token lacks required permissions | YES — HIGH | Re-consent or add scopes |
| `TOKEN_EXPIRED` | Token stale (should auto-refresh) | NO | Investigate MSAL config |
| `RATE_LIMITED` | Too many requests | NO | Back off, check polling rate |

Auth failures automatically create HIGH-severity operator alerts:
```
category: CONNECTOR_HEALTH
title: M365 Connector AUTH_FAILED
message: Connector authentication rejected. Rotate credentials immediately.
```

## Scope Isolation Enforcement

Write scopes are never used for read-only operations:

| Operation | Scopes Used | Scopes NOT Used |
|---|---|---|
| Sync | User.Read.All, Directory.Read.All | LicenseAssignment.ReadWrite.All |
| Recommendation | User.Read.All | LicenseAssignment.ReadWrite.All |
| Verification | User.Read.All | LicenseAssignment.ReadWrite.All |
| Live Execution | LicenseAssignment.ReadWrite.All | — |
| Rollback | LicenseAssignment.ReadWrite.All | — |

The platform's readiness gate enforces this at intent submission time,
independent of what scopes the token actually has.
