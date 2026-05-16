# M365 Evidence Model (Phase A)

Phase A expands normalized evidence in canonical `M365EvidenceNormalizationService` with deterministic `UNKNOWN` handling for unsupported/missing fields.

- Freshness enum: `FRESH | STALE | EXPIRED | UNKNOWN`.
- Required expanded identity, licensing, usage, storage, compliance, connector-health, and confidence dimensions are normalized in a single canonical model.
- Missing evidence is explicitly `UNKNOWN` (never inferred as false).
