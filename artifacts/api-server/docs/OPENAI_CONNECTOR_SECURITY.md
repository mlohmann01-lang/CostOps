# OpenAI Connector Security Guide

## Security Principles

The OpenAI connector implements defense-in-depth:

1. **Credential Protection**: API keys never logged, masked in output
2. **Least Privilege**: Admin API only for read-only usage sync
3. **Tenant Isolation**: Cross-tenant data access prevented
4. **Audit Trail**: All ingestion operations logged to immutable audit table
5. **Error Handling**: No secrets in error responses or stack traces
6. **Data Classification**: Real vs. mock data explicitly marked

## Credential Management

### Storage

API keys are **environment-backed only** — never stored in database or code:

```bash
# .env (never commit to git)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_ORGANIZATION_ID=org-xxxxxxxxxxxxxxxx
```

### Validation

At startup, credentials are validated for format:

```typescript
const validation = openaiCredentialManager.validateFormat();
if (!validation.valid) {
  logger.fatal(validation.reason);
  process.exit(1);
}
```

**Format requirements**:
- Starts with `sk-`
- At least 20 characters
- Alphanumeric + hyphens

### Masking in Logs

The credential manager never logs full keys:

```typescript
// ❌ WRONG
logger.info({ apiKey: "sk-..." }); // Danger!

// ✅ CORRECT
logger.info({ maskedKey: openaiCredentialManager.getMaskedApiKey() });
// Output: "sk-xxxxxxx****xxxxxY2pk" (first 7 + last 4 visible)
```

### Safe Metadata

Use `getSafeMetadata()` for all logging:

```typescript
const safe = openaiCredentialManager.getSafeMetadata();
logger.info(safe);
// {
//   configured: true,
//   maskedKey: "sk-xxxxxxx****xxxxxY2pk",
//   hasOrganizationId: true,
//   loadedAt: "2026-05-22T12:00:00Z"
// }
```

## Tenant Isolation

### Authentication

All routes require JWT authentication via `authMiddleware`:

```typescript
router.get('/readiness', requireTenant, async (req, res) => {
  const authContext = (req as { __authContext?: { tenantId: string } }).__authContext;
  if (!authContext?.tenantId) {
    return res.status(401).json({ error: 'TENANT_CONTEXT_REQUIRED' });
  }
  // authContext.tenantId verified from JWT
});
```

### Isolation Verification

Each endpoint verifies tenant ownership:

```typescript
// Request from tenant-123's JWT
const tenantId = authContext.tenantId; // "tenant-123"

// Query scoped to tenant
const events = await db.query(
  'SELECT * FROM normalized_events WHERE tenantId = ?',
  [tenantId] // Prevent cross-tenant queries
);
```

### Audit Trail

All connector operations logged with tenant context:

```json
{
  "tenantId": "tenant-123",
  "actorId": "user-xyz@example.com",
  "actorRole": "PLATFORM_ADMIN",
  "eventType": "EXECUTION_STARTED",
  "resourceType": "CONNECTOR",
  "resourceId": "OPENAI",
  "outcome": "SUCCESS",
  "payload": {
    "jobId": "openai-sync-...",
    "scope": "2026-05-01 to 2026-05-31"
  }
}
```

## API Security

### Read-Only Operations

The OpenAI connector only reads; it never mutates:

```typescript
// ✅ Allowed
- GET /usage (read)
- GET /billing/costs (read)
- GET /organization/projects (read)
- GET /organization/users (read)

// ❌ Not allowed
- POST /api/key (create)
- DELETE /organization/projects/123 (delete)
- PATCH /billing (modify)
```

### Credential Scope

API key scoped to Admin read-only:

| Permission | OpenAI Scope | Used? |
|---|---|---|
| Read billing/usage | admin | ✅ Yes |
| Manage billing | admin | ❌ No |
| Create keys | admin | ❌ No |
| Delete projects | admin | ❌ No |

### Rate Limiting

API calls are rate-limited to prevent abuse:

```typescript
// Global rate limit: 200 requests/minute
app.use(rateLimitMiddleware({ maxRequests: 200, windowMs: 60000 }));

// Per-endpoint limits
// GET /connectors/openai/sync: 20 requests/minute
// GET /connectors/openai/readiness: 50 requests/minute
```

## Data Security

### Normalization Safety

Raw API data contains no secrets; normalized data marked with source:

```typescript
{
  eventId: "openai-usage-...",
  sourceOfTruth: "CONNECTOR", // Not MOCK — real data
  isEstimated: false,
  
  // ✅ Safe: no API key, no auth tokens
  projectId: "proj-123",
  userId: "user-456",
  costUSD: 10.50
}
```

### Proof Graph Sanitization

Proof graph nodes are audit-safe:

```typescript
{
  nodeId: "connector-openai-source",
  nodeType: "CONNECTOR_SOURCE",
  properties: {
    connectorId: "OPENAI",
    apiVersion: "1.0",
    dataQuality: "REAL",
    // ❌ NO: apiKey, authToken, credentials
    // ✅ YES: IDs, timestamps, metadata
  }
}
```

### Error Response Sanitization

Error responses never leak secrets:

```typescript
// ❌ WRONG
res.status(500).json({
  error: "Failed to fetch from https://api.openai.com/v1/usage",
  authHeader: "Bearer sk-..." // Leaked!
});

// ✅ CORRECT
res.status(500).json({
  error: "OPENAI_API_ERROR",
  errorType: "UNKNOWN",
  // No details that could leak credentials
});

// Logs go to protected stdout, not response
logger.error({
  error,
  statusCode: 500,
  path: "/usage",
  // Detailed info goes here (not in response)
});
```

## Compliance

### GDPR / Data Privacy

- Tenant IDs, user IDs are identifiers only (not names/emails)
- Cost data is business data (no PII)
- Audit trail is immutable (supports compliance reporting)

### SOC 2 / Audit Controls

- All access logged to `audit_events`
- Credentials validated at startup
- Read-only scope enforcement
- Error handling without secret leakage

### Encryption in Transit

All OpenAI API calls use HTTPS:

```typescript
const url = new URL(path);
// Always uses https://api.openai.com/v1/...
// Never http://
const response = await fetch(url.toString(), {
  // fetch() enforces HTTPS by default in Node.js
});
```

### Database Security

Audit events stored in encrypted DB column (application-side):

```typescript
// Pseudocode
await auditDb.insert({
  tenantId: encryptWithKMS(tenantId),
  payload: encryptWithKMS(JSON.stringify(payload)),
  // ✅ Encrypted at rest
});
```

## Incident Response

### Credential Exposure

If API key is exposed:

1. **Immediate**: Rotate key in OpenAI console
2. **Within 1 hour**: Update `OPENAI_API_KEY` env var
3. **Restart**: Kill process to stop using old key
4. **Audit**: Check `audit_events` for unauthorized access
5. **Notify**: OpenAI support for potential abuse

### Unauthorized Access

If cross-tenant access detected:

```json
{
  "tenantId": "tenant-123",
  "eventType": "TENANT_ISOLATION_VIOLATION_ATTEMPT",
  "outcome": "BLOCKED",
  "payload": {
    "attemptedTenantId": "tenant-999",
    "sourceIP": "192.168.1.1"
  }
}
```

Response: Alert via `recordPermissionDenied()` audit helper.

## Testing Security

Run security tests:

```bash
npm run test -- openai-connector.test.ts

# Verify:
# ✅ Credentials never appear in JSON output
# ✅ No "sk-" strings in proof graph
# ✅ Tenant isolation enforced
# ✅ Recommendations safe from side channels
```

Key assertions:

```typescript
// No API keys anywhere in outputs
const jsonStr = JSON.stringify({ nodes, edges });
expect(jsonStr).not.toContain('sk-');
expect(jsonStr).not.toContain(apiKey);

// Metadata safe for logging
const metadata = openaiCredentialManager.getSafeMetadata();
expect(metadata).not.toHaveProperty('apiKey');
expect(metadata).toHaveProperty('maskedKey');
```

## Security Checklist

- [ ] `OPENAI_API_KEY` set from environment (never committed to git)
- [ ] `.env` file in `.gitignore`
- [ ] `OPENAI_API_KEY` scoped to Admin read-only in console
- [ ] JWT auth enforced on all connector routes
- [ ] Tenant context verified from JWT, never from request params
- [ ] Readiness endpoint only returns sanitized capability metadata
- [ ] Error responses don't include API details or credentials
- [ ] Audit trail recorded for all sync operations
- [ ] Proof graph has no secrets (API keys, tokens, etc.)
- [ ] Rate limiting configured to prevent abuse
- [ ] Database credentials encrypted at rest
- [ ] HTTPS enforced for all external API calls
- [ ] Tests verify no key leakage in any output format

## Deployment Checklist

Before production deployment:

```bash
# 1. Rotate credentials in dev/test
openai-api-key-rotate

# 2. Set prod environment
export NODE_ENV=production
export OPENAI_API_KEY=sk-prod-...

# 3. Validate no hardcoded keys
grep -r "sk-" . --include="*.ts" --include="*.js" | grep -v test | grep -v node_modules

# 4. Run security tests
npm run test:security

# 5. Check audit logging
tail -f logs/audit.log | head -20

# 6. Verify readiness
curl -X GET https://api.costops.example.com/connectors/openai/readiness
```

## References

- [OpenAI API Security](https://platform.openai.com/docs/guides/production-best-practices)
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0-introduction/)
- [CostOps Enterprise Trust Boundary (Sprint A)](./docs/SPRINT_A_ENTERPRISE_TRUST.md)
