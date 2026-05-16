# Persisted Explainability

Checkpoint 24C promotes recommendation explainability to immutable governance evidence.

## Rules
- Append-only rationale snapshots.
- Append-only decision traces.
- Historical APIs read persisted rows only.
- No dynamic regeneration for historical retrieval.

## Integrity
- Deterministic hash is computed from canonicalized rationale payload.
- Replay integrity compares persisted payload-derived hash vs persisted hash.

