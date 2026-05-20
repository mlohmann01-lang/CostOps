# DB Migration Backlog

## Status: Interim Compatibility Adapter Active

The Drizzle schema files currently represent a **bridge schema** — they include all columns
present in the live DB plus the advanced columns defined by the intended architecture.
The bridge allows type-safe compilation without breaking live routes.

---

## recommendations table

### Columns in live DB (16)
id, user_email, display_name, licence_sku, monthly_cost, annualised_cost,
trust_score, execution_status, status, playbook, connector, last_activity,
days_since_activity, rejection_reason, created_at, updated_at

### Columns added by bridge schema (pending DB migration via `pnpm --filter @workspace/db run push`)
tenant_id, pricing_confidence, pricing_source, entity_trust_score,
recommendation_trust_score, execution_readiness_score, critical_blockers, warnings,
score_breakdown, playbook_id, playbook_name, playbook_evidence,
playbook_required_signals, playbook_exclusions, evaluation_event_id,
ingestion_run_id, source_timestamp, connector_health, data_freshness_score,
freshness_band, partial_data, connector_health_snapshot, action_type,
target_entity_id, target_entity_type, evidence_summary, trust_requirements,
expected_monthly_saving, expected_annual_saving, recommendation_risk_class,
recommendation_execution_mode, recommendation_verification_method, rollback_notes,
recommendation_status, latest_rationale_id, correlation_id

---

## outcome_ledger table

### Columns in live DB (17)
id, recommendation_id (integer), user_email, display_name, action, licence_sku,
before_cost, after_cost, monthly_saving, annualised_saving, approved, executed,
execution_mode, evidence, approved_at, executed_at, created_at

### Columns added by bridge schema (pending DB migration)
tenant_id, playbook_id, playbook_name, action_risk_profile, trust_snapshot,
before_state, after_state, dry_run_result, execution_evidence, pricing_snapshot,
pricing_confidence, pricing_source, saving_confidence, actor_id, execution_status,
idempotency_key (nullable — bridge adaptation; must be backfilled and made NOT NULL
after migration)

### Type migration needed
recommendation_id: currently integer in live DB; intended design uses text (UUID).
Requires a coordinated migration with recommendation ID scheme change.

---

## To apply pending migrations

```bash
pnpm --filter @workspace/db run push
```

Review all proposed changes carefully before confirming destructive operations.
Run against a staging DB first.

---

## Other tables not yet in live DB

All tables defined in `lib/db/src/schema/` beyond `connectors`, `recommendations`,
and `outcome_ledger` are architectural definitions only. They will be created by
`drizzle-kit push` when applied. Routes that reference these tables handle DB errors
gracefully (500 with JSON body) until migrations are applied.

Migration order recommendation:
1. `connector_sync_status`, `m365_users`, `m365_connector_configs`, `m365_evidence_records`
2. `recommendations` column additions (see above)
3. `outcome_ledger` column additions + idempotency_key backfill
4. All other operational/governance tables
