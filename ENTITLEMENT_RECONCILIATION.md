# Entitlement Reconciliation

## Purpose

Entitlement reconciliation compares what licenses are **assigned in M365** against
what licenses are **entitled in Flexera**, to detect over-entitlement, data drift,
and unmanaged license assignments.

## Reconciliation Process

### 1. Collect M365 Snapshot

The sync job pulls assigned licenses for each user:

```
For each user in tenant:
  GET /users/{userId}?$select=assignedLicenses,accountEnabled
  → assignedLicenses[].skuId
```

### 2. Collect Flexera Snapshot

The Flexera connector pulls entitled licenses for the same user set:

```
GET /flexera/entitlements?tenantId=<id>&userIds[]=<id>...
→ { userId, entitledSkuIds: [...] }
```

### 3. Run Comparison

```typescript
const result = await flexeraValidator.validateEntitlements(
  tenantId,
  m365Snapshot,   // [{ userId, assignedSkuIds: [...] }]
  flexeraSnapshot // [{ userId, entitledSkuIds: [...] }]
);
```

### 4. Classify Each Discrepancy

For each user × SKU combination:

| M365 State | Flexera State | Classification | Action |
|---|---|---|---|
| Assigned | Entitled | ✅ Match | No action |
| Assigned | Not entitled | ⚠️ M365_NOT_IN_FLEXERA | Review |
| Not assigned | Entitled | 🚨 FLEXERA_NOT_IN_M365 | Investigate |
| Assigned to disabled user | Entitled | 🎯 Reclaim candidate | Generate recommendation |

### 5. Enrich Proof Graph

Each match or mismatch creates a proof node attached to the recommendation.
This proof chain allows operators to trace the origin of each recommendation
back to the entitlement data that justified it.

## Reconciliation for Reclaim Recommendations

When a reclaim recommendation is generated:

```
User: disabled.user@contoso.com
Assigned SKUs (M365): [Microsoft_365_E3, Power_BI_Pro]
Entitled SKUs (Flexera): [Microsoft_365_E3, Power_BI_Pro]

Result:
  - Both SKUs matched → dataTrustBoost = +0.07
  - Recommendation confidence INCREASED
  - Proof nodes: [flexera-match-E3, flexera-match-PowerBI]
```

vs.

```
User: disabled.user@contoso.com
Assigned SKUs (M365): [Microsoft_365_E3, Power_BI_Pro]
Entitled SKUs (Flexera): [Microsoft_365_E3]  ← Power_BI_Pro missing

Result:
  - E3 matched, Power_BI_Pro mismatch (M365_NOT_IN_FLEXERA, LOW)
  - dataTrustConflict = false (LOW severity doesn't block)
  - Recommendation proceeds but with flag in proof
  - Proof nodes: [flexera-match-E3, flexera-mismatch-PowerBI-LOW]
```

vs.

```
User: disabled.user@contoso.com
Assigned SKUs (M365): [Microsoft_365_E3]
Entitled SKUs (Flexera): [Microsoft_365_E3, Power_BI_Pro]  ← extra in Flexera

Result:
  - E3 matched, Power_BI_Pro FLEXERA_NOT_IN_M365 (HIGH severity)
  - dataTrustConflict = true
  - Recommendation confidence DECREASED
  - Operator alert created: FLEXERA_NOT_IN_M365 requires investigation
  - Proof nodes: [flexera-match-E3, flexera-mismatch-PowerBI-HIGH]
```

## Reconciliation Cadence

| Trigger | Frequency | Covers |
|---|---|---|
| Full sync (scheduler) | Daily or on-demand | All users in tenant |
| Pre-execution check | On EXECUTE intent | Single user being acted on |
| Post-execution verification | 30min after execution | Verifies reclaim completed |
| Scheduled drift scan | Every 6 hours | Monitors previously reclaimed users |

## Data Freshness Requirements

Flexera data must be no older than 24 hours for it to influence trust scores.
If Flexera data is stale (`evidenceFreshness: STALE`):
- Trust boost is NOT applied
- Reconciliation proof nodes are marked with `confidence: 0.5` (degraded)
- Operator alert created: `FLEXERA_DATA_STALE`

## Handling Reconciliation Failures

| Failure | Behavior | Alert |
|---|---|---|
| Flexera API unavailable | Skip reconciliation, proceed without trust boost | CONNECTOR_DEGRADED |
| Flexera returns 401 | Block enrichment, create AUTH_FAILED alert | HIGH severity |
| Partial data (some users missing) | Reconcile available data, flag missing users | LOW severity |
| SKU normalization failure | Skip that SKU pair, log warning | No alert |

Flexera enrichment failure does NOT block recommendation generation or execution.
The platform degrades gracefully to operate on M365 data alone.

## Audit Trail

All reconciliation runs are logged with:
```json
{
  "tenantId": "TENANT-A",
  "action": "FLEXERA_RECONCILIATION",
  "result": "COMPLETED",
  "matched": 12,
  "mismatches": 2,
  "dataTrustBoost": 0.07,
  "correlationId": "corr-...",
  "timestamp": "2026-05-21T08:00:00Z"
}
```

Mismatch details are stored in the proof graph nodes, which are linked to the
recommendation and visible in the investigation UX.
