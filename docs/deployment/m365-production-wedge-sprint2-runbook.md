# Microsoft 365 Production Wedge Sprint 2 Runbook

## Authority

This runbook makes the Microsoft 365 production wedge the platform authority for the first-customer optimization flow:

`Connector → Discovery → Identity → Trust → Opportunity → Evidence → Outcome Ledger`

No downstream service should create a Microsoft 365 recommendation unless the production authority run has produced all of the following:

1. Canonical identity resolution.
2. Entity and recommendation trust scores.
3. Evidence pack with lineage back to Microsoft Graph sources.
4. Outcome ledger event for `RECOMMENDATION_CREATED`.

## Required tenant prerequisites

Configure a Microsoft Entra app registration with delegated OAuth2 authorization-code consent for the onboarding user. The authority connector expects these minimum Graph scopes:

- `User.Read.All`
- `Group.Read.All`
- `Directory.Read.All`
- `Reports.Read.All`
- `Organization.Read.All`

For production live execution, keep mutation permissions separate and disabled until approval, rollback, verification, and drift controls are independently proven.

## Runtime configuration

Set these variables before onboarding a real tenant:

- `CONNECTOR_SECRET_KEY` — encryption key material used by connector secret storage.
- `M365_TENANT_ID` — Microsoft tenant ID for readiness fallback.
- `M365_CLIENT_ID` — Entra app registration client ID.
- `M365_CLIENT_SECRET` — Entra app registration client secret.
- `M365_GRAPH_GRANTED_PERMISSIONS` — space- or comma-delimited granted permissions for readiness reporting.

## Onboarding sequence

1. `GET /api/connectors/m365/authority/onboarding`
   - Confirms the seven-step onboarding flow: connect, validate permissions, discover, review trust, generate opportunities, generate evidence packs, executive review.
2. `POST /api/connectors/m365/authority/connect`
   - Body: `tenantId`, `clientId`, `clientSecret`, `authorizationCode`, `redirectUri`, `scopes`.
   - The authorization code is exchanged against Microsoft identity platform before the connector reports `CONNECTED`.
   - The code is never persisted; connector credentials and refresh-token metadata are stored through encrypted connector secret storage.
3. `GET /api/connectors/m365/readiness?tenantId=<tenant>` or `POST /api/connectors/m365/readiness/check?tenantId=<tenant>`
   - Validate Graph configuration and permission coverage before discovery.
4. `POST /api/connectors/m365/authority/run?tenantId=<tenant>`
   - Performs live discovery unless `useCachedSnapshot=true` is supplied outside production.
   - Writes raw Graph lineage into the raw snapshot store, normalizes to canonical entities, resolves identities, scores trust, creates only the three approved playbooks, builds evidence packs, persists outcome ledger events, and returns the executive proof pack.
5. Review `productionGates` in the response.
   - `passed=false` means recommendations are blocked and must not be executed or surfaced as trusted savings.

## Production gates

The authority hard-blocks any recommendation missing:

- Identity resolution.
- Trust score.
- Evidence pack.
- Outcome ledger entry linked to the evidence pack.

The API returns HTTP `409` for an authority run with failed production gates.

## Operational verification checklist

Use this sequence for a real tenant smoke:

```bash
pnpm typecheck
pnpm --filter @workspace/api-server run test -- m365-production-authority.test.ts
curl -X GET "$BASE/api/connectors/m365/authority/capabilities?tenantId=$TENANT"
curl -X POST "$BASE/api/connectors/m365/authority/connect" \
  -H 'content-type: application/json' \
  -d '{"tenantId":"'$TENANT'","clientId":"'$CLIENT_ID'","clientSecret":"'$CLIENT_SECRET'","authorizationCode":"'$AUTH_CODE'","redirectUri":"'$REDIRECT_URI'","scopes":["User.Read.All","Group.Read.All","Directory.Read.All","Reports.Read.All","Organization.Read.All"]}'
curl -X POST "$BASE/api/connectors/m365/authority/run?tenantId=$TENANT" \
  -H 'content-type: application/json' \
  -d '{"maxUsers":100,"perPage":100}'
```

A successful run should return:

- `canonical.users.length > 0`
- At least one `identityResolutions[*].state` of `MATCHED` or `LIKELY_MATCHED`
- Recommendations only of `LICENSE_RECLAIM`, `LICENSE_RIGHTSIZE`, or `COPILOT_GOVERNANCE`
- `evidencePacks.length === recommendations.length`
- `ledgerPersisted === true`
- `productionGates.passed === true`
- An `executiveProofPack` with evidence coverage and approval requirements

## Failure handling

- `M365_REDIRECT_URI_REQUIRED_FOR_AUTHORIZATION_CODE`: retry connect with the exact redirect URI registered in Entra.
- `AUTH_CODE_TOKEN_FAILED_*`: verify app registration, secret validity, redirect URI, consent, and code freshness.
- `M365_AUTHORITY_RUN_FAILED`: check Graph readiness and discovery blockers.
- HTTP `409` from authority run: inspect `productionGates.blockers`; do not bypass.
