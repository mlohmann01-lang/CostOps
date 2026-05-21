# Flexera Validation Model

## Purpose

Flexera serves as an independent entitlement inventory source to validate and
enhance the confidence of M365 license reclaim recommendations.

The core question Flexera answers: **"Does the entitlement record agree with the
M365 Graph API assignment data?"**

When they agree, recommendation confidence increases.
When they disagree, a CONFLICT is flagged and confidence decreases.

## Integration Architecture

```
M365 Graph API                    Flexera API
     │                                 │
     │ assigned licenses (per user)    │ entitled licenses (per user)
     ▼                                 ▼
  M365 Snapshot ─────────────────► FlexeraEntitlementValidator
                                        │
                                        │ validateEntitlements(tenantId, m365Snapshot, flexeraSnapshot)
                                        ▼
                                   ValidationResult:
                                   - matched: List of SKUs in both
                                   - mismatches: SKUs in one but not the other
                                   - dataTrustBoost: +0.05 to 0.10 (agreement)
                                   - dataTrustConflict: true (disagreement)
                                   - proofNodes: enriched proof graph nodes
```

## Validation Logic

### Match Determination

SKU comparison is case-insensitive and ID-based:

```typescript
// SKU "Microsoft_365_E3" matches "microsoft_365_e3" matches "MICROSOFT_365_E3"
const matched = m365SkuIds.filter(sku =>
  flexeraSkuIds.some(f => f.toLowerCase() === sku.toLowerCase())
);
```

### Mismatch Categories

| Mismatch Type | Description | Severity |
|---|---|---|
| `M365_NOT_IN_FLEXERA` | License in M365 but not in Flexera entitlement | LOW — may be unmanaged |
| `FLEXERA_NOT_IN_M365` | License in Flexera but not assigned in M365 | HIGH — possible over-entitlement |
| `QUANTITY_MISMATCH` | Counts differ between systems | MEDIUM — data drift |

### Trust Score Impact

| Scenario | Trust Adjustment |
|---|---|
| All SKUs matched between systems | +dataTrustBoost (0.05-0.10) |
| Any mismatch detected | dataTrustConflict = true (no boost) |
| Flexera has more licenses than M365 | dataTrustConflict = true, HIGH severity mismatch |
| Both systems agree user is disabled | Additional confidence factor |

## Proof Graph Enrichment

Each validation produces proof nodes for the execution proof graph:

```typescript
// For a matched SKU
{
  proofId: "flexera-match-TENANT-A-Microsoft_365_E3",
  proofType: "FLEXERA_ENTITLEMENT_PROOF",
  title: "Flexera Entitlement Match",
  summary: "Microsoft_365_E3 confirmed in both Flexera and M365",
  confidence: 0.9,
  dataTrustBoost: 0.07,
  source: "flexera",
  environment: "PRODUCTION",
  sourceOfTruth: "CONNECTOR"
}

// For a mismatch
{
  proofId: "flexera-mismatch-TENANT-A-Power_BI_Pro",
  proofType: "FLEXERA_MISMATCH_PROOF",
  title: "Flexera Entitlement Mismatch",
  summary: "Power_BI_Pro found in Flexera but not in M365",
  confidence: 0.3,
  dataTrustBoost: 0,
  mismatchSeverity: "HIGH",
  source: "flexera"
}
```

## Data Trust Score Integration

The `trustScore` on a recommendation is influenced by Flexera validation:

```
trustScore = base_trust
  + (flexeraValidation.dataTrustBoost if no conflict)
  - (conflict_penalty if dataTrustConflict)
```

If a HIGH-severity mismatch is detected, the recommendation may be blocked from
execution until the discrepancy is resolved, to prevent acting on stale or incorrect data.

## Configuration

```bash
FLEXERA_BASE_URL=https://api.flexera.com
FLEXERA_API_KEY=<api-key>           # From vault
FLEXERA_MODE=LIVE                   # or MOCK_CONNECTOR
```

## Mock Mode

```bash
FLEXERA_MODE=MOCK_CONNECTOR
```

In mock mode:
- `fetchEntitlements` returns a deterministic fixture set
- SKU matching uses the fixture data
- Proof nodes are generated from fixture results
- No real Flexera API calls are made

Use mock mode for all smoke tests and development environments.

## Readiness States

| State | Meaning | Impact |
|---|---|---|
| `READY` | Flexera connected, credentials valid | Full validation available |
| `UNCONFIGURED` | No Flexera credentials | Validation skipped, no trust boost |
| `DEGRADED` | API errors or partial failures | Validation may be incomplete |
| `AUTH_FAILED` | Invalid API key | Alert created, validation blocked |

When Flexera is `UNCONFIGURED`, the platform continues without the trust boost.
This is acceptable for initial deployments — Flexera enrichment is an enhancement,
not a hard requirement.

## Entitlement Reconciliation Summary

Each validation run produces a summary:

```typescript
{
  tenantId: "TENANT-A",
  totalM365Skus: 3,
  totalFlexeraSkus: 3,
  matchedCount: 2,
  mismatchCount: 1,
  highSeverityMismatches: 1,
  dataTrustBoost: 0,         // no boost when conflict present
  dataTrustConflict: true,
  proofNodes: [...]
}
```

This summary is included in the recommendation's proof graph and visible in the
platform's investigation UX.
