# OpenAI Connector Setup Guide

## Overview

The OpenAI Real Usage & Cost Connector enables real-time ingestion of OpenAI API usage and cost data through the OpenAI Admin API. This guide covers setup, credential configuration, and readiness validation.

## Prerequisites

- OpenAI organization with Admin API access enabled
- OpenAI API key with Admin permissions
- CostOps platform running on Node.js 18+

## Step 1: Obtain OpenAI Admin API Credentials

1. Log in to [OpenAI Platform Console](https://platform.openai.com)
2. Navigate to **Settings > Billing > Usage & Costs**
3. Verify your organization has access to the Admin API
4. Create a new API key:
   - Go to **Settings > API Keys**
   - Click "Create new secret key"
   - Select scope: "Admin"
   - Copy the key (format: `sk-...`)
5. (Optional) Get your Organization ID:
   - From **Settings > Organization settings**
   - Copy the Organization ID

## Step 2: Configure Environment Variables

Set the following environment variables in your `.env` file:

```bash
# Required
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional (recommended for multi-org setup)
OPENAI_ORGANIZATION_ID=org-xxxxxxxxxxxxxxxx

# Enable connector
OPENAI_CONNECTOR_ENABLED=true
```

## Step 3: Validate Credentials

Use the readiness endpoint to validate your setup:

```bash
curl -X GET http://localhost:3000/api/connectors/openai/readiness \
  -H "Authorization: Bearer <your_jwt_token>"
```

Expected response (when ready):

```json
{
  "connector": "OPENAI",
  "readiness": {
    "connectorId": "OPENAI",
    "overallState": "READY",
    "capabilityStatuses": [
      {
        "capability": "CREDENTIAL_VALIDATION",
        "state": "READY",
        "lastCheckedAt": "2026-05-22T12:00:00Z"
      },
      {
        "capability": "USAGE_DATA_READ",
        "state": "READY",
        "lastCheckedAt": "2026-05-22T12:00:00Z"
      },
      {
        "capability": "COST_DATA_READ",
        "state": "READY",
        "lastCheckedAt": "2026-05-22T12:00:00Z"
      },
      {
        "capability": "PROJECT_ATTRIBUTION",
        "state": "READY",
        "lastCheckedAt": "2026-05-22T12:00:00Z"
      },
      {
        "capability": "USER_ATTRIBUTION",
        "state": "READY",
        "lastCheckedAt": "2026-05-22T12:00:00Z"
      },
      {
        "capability": "BILLING_PERIOD_SYNC",
        "state": "READY",
        "lastCheckedAt": "2026-05-22T12:00:00Z"
      }
    ],
    "readinessScore": 1.0,
    "lastAssessedAt": "2026-05-22T12:00:00Z"
  }
}
```

## Step 4: Trigger First Sync

Once readiness is confirmed, trigger the first data sync:

```bash
curl -X POST http://localhost:3000/api/connectors/openai/sync \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-22",
    "endDate": "2026-05-22"
  }'
```

Response (HTTP 202 Accepted):

```json
{
  "jobId": "openai-sync-tenant-123-1716374400000",
  "status": "SUCCESS",
  "tenantId": "tenant-123"
}
```

## Step 5: Configure Sync Schedule

Set up periodic syncs via your job scheduler:

```typescript
// Schedule daily sync at 2 AM UTC
schedule('0 2 * * *', async () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  await openaiSyncJob.execute({
    tenantId: req.tenantId,
    startDate: yesterday.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    jobId: `daily-sync-${today.getTime()}`,
    correlationId: 'scheduler',
  });
});
```

## Troubleshooting

### "CREDENTIAL_VALIDATION" shows UNAVAILABLE

- **Cause**: API key invalid or expired
- **Fix**: Verify API key is correct, refresh if needed, ensure it has Admin scope

### "USAGE_DATA_READ" shows DEGRADED

- **Cause**: No usage data available in date range
- **Fix**: Ensure there's actual API usage during the requested period

### Rate limiting (429 errors)

- **Cause**: Too many requests to OpenAI Admin API
- **Fix**: Sync less frequently, increase batch window, implement exponential backoff

### Partial data ingestion

The connector gracefully handles partial data failures and sets flags:
- `hasPartialUsageData`: true if usage fetch failed
- `hasPartialCostData`: true if cost fetch failed
- `hasMissingAttribution`: true if project/user data incomplete

Check logs for specific errors and consider increasing retry attempts.

## Next Steps

1. View latest telemetry: `GET /api/connectors/openai/telemetry/latest`
2. Check recommendations: See OpenAI Connector Ingestion Guide
3. Monitor sync jobs: `GET /api/connectors/openai/jobs/{jobId}`
4. Configure packs: See OpenAI Connector Mapping Guide
