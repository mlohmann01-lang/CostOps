# M365 Read-only Ingestion

This connector runs in **READ_ONLY** mode only and does not perform license/user mutations.

## Endpoints
- `GET /api/connectors/m365/status`
- `POST /api/connectors/m365/validate`
- `POST /api/connectors/m365/sync/read-only`
- `GET /api/connectors/m365/evidence`
- `POST /api/connectors/m365/evaluate-playbooks`

## Safety
- No write scopes or mutation endpoints are exposed by the Graph read-only client.
- Evaluate playbooks only generates recommendations from persisted evidence.
