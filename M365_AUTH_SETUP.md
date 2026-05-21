# M365 Authentication Setup Guide

## Overview

The platform uses the OAuth 2.0 client credentials flow to authenticate with
Microsoft Graph API. All credentials are tenant-scoped and vault-stored.

## App Registration Requirements

Create one App Registration per deployment environment (dev/pilot/production).
Do NOT share registrations across environments.

### Step 1 — Create App Registration

1. Go to Entra ID > App registrations > New registration
2. Name: `CostOps Economic Operations - <Environment>`
3. Supported account types: `Accounts in this organizational directory only`
4. Redirect URI: None (service-to-service, no user sign-in)

### Step 2 — Configure API Permissions

Add the following **Application** (not Delegated) permissions to Microsoft Graph:

#### Read-Only Scopes (sync, recommendation, verification, posture)

| Permission | Use |
|---|---|
| `User.Read.All` | Read user profiles, account status |
| `Organization.Read.All` | Read org-level license assignments |
| `Directory.Read.All` | Read directory objects |
| `LicenseAssignment.ReadWrite.All` | Read license assignments (ReadWrite required for write scopes below) |

Grant admin consent for all read permissions.

#### Write Scopes (live license mutation — separate consent)

| Permission | Use | When Required |
|---|---|---|
| `LicenseAssignment.ReadWrite.All` | Assign/remove licenses | `M365_LIVE_LICENSE_MUTATION_ENABLED=true` |
| `Directory.ReadWrite.All` | Write directory objects if needed | Optional |

**Important**: Write scopes MUST have a separate admin consent ceremony documented
in the deployment record. Do not mix read and write consent grants without approval.

### Step 3 — Create Client Secret

1. Certificates & secrets > New client secret
2. Description: `CostOps-<Env>-<YYYY-MM>`
3. Expiry: 12 months (maximum for secrets used in automation)
4. Copy the value immediately — it is shown only once

Store in vault immediately. Never paste into shell history or config files.

### Step 4 — Configure Environment Variables

```bash
AZURE_TENANT_ID=<your-azure-tenant-id>        # From App Registration overview
AZURE_CLIENT_ID=<your-client-id>               # Application (client) ID
AZURE_CLIENT_SECRET=<client-secret-value>     # From step 3, retrieved from vault
M365_GRAPH_GRANTED_PERMISSIONS="User.Read.All Directory.Read.All Organization.Read.All LicenseAssignment.ReadWrite.All"
```

**For live execution only (add after explicit go-live decision):**
```bash
M365_LIVE_LICENSE_MUTATION_ENABLED=true
```

## Scope Isolation Model

The platform enforces scope isolation at the readiness gate level:

```
evaluateM365LiveExecutionReadiness({
  grantedGraphScopes: process.env.M365_GRAPH_GRANTED_PERMISSIONS.split(' ')
})
```

If the required write scope is not in `M365_GRAPH_GRANTED_PERMISSIONS`, the
execution will be blocked at the readiness gate BEFORE any Graph API call is made.

This means: **even if the App Registration has write scopes, the platform will refuse
to use them unless `M365_GRAPH_GRANTED_PERMISSIONS` is explicitly set to include them.**

Read-only operations (sync, verification, drift scan) only require read scopes.
Write operations (license removal, rollback reassignment) require write scopes AND
`M365_LIVE_LICENSE_MUTATION_ENABLED=true`.

## Token Lifecycle

The platform acquires tokens via `getGraphAccessToken()`:

```typescript
// Token acquisition
const token = await getGraphAccessToken();
if (!token.accessToken) {
  return reject('INTENT_BLOCKED_BY_CONNECTOR');
}
```

Token caching is handled by the MSAL library (if configured) or by the platform's
token cache. Tokens expire after 1 hour and are automatically refreshed.

## Scope Verification Check

Before enabling live execution, verify the token has the required scopes:

```bash
# Decode the access token to verify scopes
# Replace <token> with actual token from get-graph-access-token endpoint
echo "<token>" | cut -d. -f2 | base64 -d 2>/dev/null | jq '.roles'
```

Expected output for read-only:
```json
["User.Read.All", "Directory.Read.All", "Organization.Read.All", "LicenseAssignment.ReadWrite.All"]
```

## Connector Health States for Auth Failures

| State | Cause | Impact |
|---|---|---|
| `AUTH_FAILED` | Invalid credentials, revoked secret | Blocks execution AND sync |
| `MISSING_SCOPES` | Token lacks required scopes | Blocks execution only |
| `TOKEN_EXPIRED` | Stale token (should auto-refresh) | Temporary, auto-recovering |
| `DEGRADED` | Partial API failures | Blocks execution, allows sync |

See `CONNECTOR_SECRET_STRATEGY.md` for secret rotation procedures.

## Testing Auth Configuration

```bash
# Test read-only access
M365_GRAPH_MODE=LIVE \
AZURE_TENANT_ID=... \
AZURE_CLIENT_ID=... \
AZURE_CLIENT_SECRET=... \
node -e "
const { getGraphAccessToken } = require('./dist/lib/connectors/m365/m365-graph-client.js');
getGraphAccessToken().then(t => {
  if (t.accessToken) {
    console.log('AUTH OK - token acquired');
  } else {
    console.error('AUTH FAILED:', t.error);
  }
});
"
```

## Consent Ceremony Documentation

For each environment deployment, document:

| Field | Value |
|---|---|
| Tenant ID | |
| App Registration Name | |
| Client ID | |
| Admin Consent Granted By | |
| Admin Consent Date | |
| Read Scopes Consented | |
| Write Scopes Consented | |
| Secret Expiry Date | |
| Vault Location | |
| Next Rotation Date | |
