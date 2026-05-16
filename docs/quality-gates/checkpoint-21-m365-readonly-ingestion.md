# Checkpoint 21 — M365 Read-only Ingestion

- M365 connector config model added.
- Graph read-only client added (read endpoints only).
- Evidence normalization service added and mapped to playbook evidence fields.
- Read-only sync service persists normalized evidence.
- Playbook evaluation uses persisted evidence without execution.
- UI panel added at `/connectors/m365` with read-only badge and sync/evaluate controls.
