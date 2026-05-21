# AI Connector Readiness

## Overview

The AI connector layer provides the data ingestion interface between external AI providers and the Economic Operations platform. Seven provider connectors are defined. All are currently operating in mock mode, meaning they return deterministic synthetic data that mirrors realistic provider payloads. This document describes each connector's capabilities, configuration, and what is required to transition from mock to live data.

---

## Connector Capability Reference

Eight capabilities are defined:

| Capability | Description |
|---|---|
| `READ_TOKEN_USAGE` | Fetch per-request or aggregate token usage from the provider's usage API |
| `READ_MODEL_USAGE` | Fetch per-model breakdown of requests and token counts |
| `READ_SEAT_ASSIGNMENTS` | Fetch the list of users with an active seat or entitlement |
| `READ_BILLING_EXPORT` | Fetch billing line items from the provider's cost export API |
| `READ_AGENT_ACTIVITY` | Fetch autonomous agent execution logs |
| `READ_WORKSPACE_ACTIVITY` | Fetch IDE or workspace session activity |
| `MANAGE_SEATS` | Reclaim or reassign seats via the provider's admin API |
| `MANAGE_LIMITS` | Set spend limits or quota guardrails via the provider's API |

---

## Provider Profiles

### OPENAI

| Property | Value |
|---|---|
| Display Name | OpenAI |
| syncIntervalHours | 24 |
| billingExportLagHours | 48 |
| seatDataAvailable | true |
| tokenDataAvailable | true |
| agentActivityAvailable | false |
| workspaceActivityAvailable | false |
| mockMode | true |
| rateLimitRequestsPerMinute | 60 |

Capabilities: `READ_TOKEN_USAGE`, `READ_MODEL_USAGE`, `READ_BILLING_EXPORT`, `READ_SEAT_ASSIGNMENTS`, `MANAGE_LIMITS`

Notes: Billing export data lags 48 hours. Seat data is available through the organization admin API. Does not provide native agent activity or workspace session data.

---

### ANTHROPIC

| Property | Value |
|---|---|
| Display Name | Anthropic |
| syncIntervalHours | 24 |
| billingExportLagHours | 24 |
| seatDataAvailable | true |
| tokenDataAvailable | true |
| agentActivityAvailable | false |
| workspaceActivityAvailable | false |
| mockMode | true |
| rateLimitRequestsPerMinute | 60 |

Capabilities: `READ_TOKEN_USAGE`, `READ_MODEL_USAGE`, `READ_BILLING_EXPORT`, `READ_SEAT_ASSIGNMENTS`

Notes: Billing lag is 24 hours — faster than OpenAI. Does not support MANAGE_LIMITS via API.

---

### CURSOR

| Property | Value |
|---|---|
| Display Name | Cursor |
| syncIntervalHours | 12 |
| billingExportLagHours | 0 |
| seatDataAvailable | true |
| tokenDataAvailable | false |
| agentActivityAvailable | false |
| workspaceActivityAvailable | true |
| mockMode | true |
| rateLimitRequestsPerMinute | 30 |

Capabilities: `READ_SEAT_ASSIGNMENTS`, `READ_WORKSPACE_ACTIVITY`, `MANAGE_SEATS`

Notes: Cursor does not expose token-level usage data. Billing export is real-time (zero lag). Syncs every 12 hours given the seat-focused use case. Supports MANAGE_SEATS for reclaim operations.

---

### WINDSURF

| Property | Value |
|---|---|
| Display Name | Windsurf |
| syncIntervalHours | 12 |
| billingExportLagHours | 0 |
| seatDataAvailable | true |
| tokenDataAvailable | false |
| agentActivityAvailable | false |
| workspaceActivityAvailable | true |
| mockMode | true |
| rateLimitRequestsPerMinute | 30 |

Capabilities: `READ_SEAT_ASSIGNMENTS`, `READ_WORKSPACE_ACTIVITY`, `MANAGE_SEATS`

Notes: Identical capability profile to Cursor. The overlap between Cursor and Windsurf seat holders is the primary signal consumed by the AI Overlap Elimination pack. The pre-computed `WINDSURF_CURSOR_OVERLAP_EMAILS` constant in the Windsurf connector provides the deterministic overlap dataset.

---

### AZURE_OPENAI

| Property | Value |
|---|---|
| Display Name | Azure OpenAI |
| syncIntervalHours | 24 |
| billingExportLagHours | 72 |
| seatDataAvailable | false |
| tokenDataAvailable | true |
| agentActivityAvailable | false |
| workspaceActivityAvailable | false |
| mockMode | true |
| rateLimitRequestsPerMinute | 120 |

Capabilities: `READ_TOKEN_USAGE`, `READ_MODEL_USAGE`, `READ_BILLING_EXPORT`, `MANAGE_LIMITS`

Notes: Billing lag is 72 hours — the longest of all providers, due to Azure's cost pipeline delay. No seat data is available (usage is billed per-token, not per-seat). Supports MANAGE_LIMITS for deployment quota controls. Rate limit is 120 requests/min due to Azure's higher API quotas.

---

### GOOGLE_AI

| Property | Value |
|---|---|
| Display Name | Google AI |
| syncIntervalHours | 24 |
| billingExportLagHours | 48 |
| seatDataAvailable | false |
| tokenDataAvailable | true |
| agentActivityAvailable | false |
| workspaceActivityAvailable | false |
| mockMode | true |
| rateLimitRequestsPerMinute | 60 |

Capabilities: `READ_TOKEN_USAGE`, `READ_MODEL_USAGE`, `READ_BILLING_EXPORT`

Notes: Does not support seat data or usage management via the current connector. Billing lag matches OpenAI at 48 hours.

---

### PERPLEXITY

| Property | Value |
|---|---|
| Display Name | Perplexity |
| syncIntervalHours | 48 |
| billingExportLagHours | 48 |
| seatDataAvailable | false |
| tokenDataAvailable | true |
| agentActivityAvailable | false |
| workspaceActivityAvailable | false |
| mockMode | true |
| rateLimitRequestsPerMinute | null (undocumented) |

Capabilities: `READ_TOKEN_USAGE`, `READ_BILLING_EXPORT`

Notes: The most limited capability profile. Sync interval is 48 hours due to Perplexity's less granular usage API. No rate limit constant is defined because Perplexity has not published a documented limit.

---

## Capability Support Matrix

| Capability | OPENAI | ANTHROPIC | CURSOR | WINDSURF | AZURE_OPENAI | GOOGLE_AI | PERPLEXITY |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| READ_TOKEN_USAGE | Y | Y | | | Y | Y | Y |
| READ_MODEL_USAGE | Y | Y | | | Y | Y | |
| READ_SEAT_ASSIGNMENTS | Y | Y | Y | Y | | | |
| READ_BILLING_EXPORT | Y | Y | | | Y | Y | Y |
| READ_AGENT_ACTIVITY | | | | | | | |
| READ_WORKSPACE_ACTIVITY | | | Y | Y | | | |
| MANAGE_SEATS | | | Y | Y | | | |
| MANAGE_LIMITS | Y | | | | Y | | |

---

## Mock Mode

All seven connectors have `mockMode: true`. In mock mode:

- `runSync(tenantId)` returns deterministic synthetic records generated from the tenantId seed
- No external HTTP calls are made
- Health checks return `'HEALTHY'` unconditionally
- Seat and usage record shapes match the types defined in `ai-connector-types.ts`
- The Cursor/Windsurf overlap scenario is pre-seeded via `WINDSURF_CURSOR_OVERLAP_EMAILS`

Mock data is designed to be realistic in shape and volume, enabling end-to-end testing of the full governance pack lifecycle without live credentials.

---

## Readiness Transition

To move a connector from `mockMode: true` to `mockMode: false`, the following must be in place:

1. **API credentials** — A connector secret stored in the platform's secrets manager (see `CONNECTOR_SECRET_STRATEGY.md`). The connector reads credentials via environment variables at runtime.

2. **API scope grants** — The required OAuth scopes or API keys must be provisioned by the provider admin. For example, OpenAI requires an organization-level API key with usage read access; Cursor requires an admin token with seat management permission.

3. **Connector implementation** — The `runSync()` method must be updated to call the provider's live API instead of returning mock records. The interface contract (`BaseAIConnector`) remains unchanged.

4. **Health check wiring** — `checkHealth()` must perform a live probe of the provider API (e.g. a lightweight status endpoint) and return `'DEGRADED'` or `'FAILED'` on error.

5. **Rate limit handling** — Connectors with defined `rateLimitRequestsPerMinute` values must implement backoff logic. Connectors where the value is `null` (Perplexity) should implement conservative retry-with-backoff defaults.

6. **Freshness validation** — Once live, the `assessConnectorFreshness()` function in `ai-telemetry-freshness.ts` will compute real staleness based on `lastSyncAt`. The `FRESH_HOURS` (4h), `STALE_HOURS` (24h), and `MISSING_HOURS` (72h) thresholds apply unchanged.

The `listReadyConnectors()` and `listMockConnectors()` functions in `ai-connector-capability-registry.ts` can be used to programmatically enumerate which connectors are live vs mock at any point.
