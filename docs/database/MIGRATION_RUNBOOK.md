# Database Migration Runbook

## Overview

CostOps uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL. Schema definitions live in `lib/db/src/schema/` (92 tables). Generated migrations live in `lib/db/drizzle/`. The `drizzle-kit migrate` command applies pending migrations to the target database.

---

## Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgres://user:pass@host:5432/dbname` |

---

## Local Development

For local development, use `drizzle-kit push` to sync the schema directly without migration files. This is the fast path that overwrites the database schema without tracking history.

```bash
# Sync schema directly to local DB (no migration files needed)
cd lib/db
DATABASE_URL="postgres://localhost:5432/certen_dev" pnpm push

# Force push (skips safety prompts — use with caution on shared databases)
DATABASE_URL="postgres://localhost:5432/certen_dev" pnpm push-force
```

To generate new migration files after schema changes (required before staging/production):

```bash
cd lib/db
DATABASE_URL="postgres://localhost:5432/certen_dev" pnpm generate
```

This creates a new SQL file under `lib/db/drizzle/` and appends an entry to `lib/db/drizzle/meta/_journal.json`.

---

## Staging Migration

Run migrations against the staging database using `drizzle-kit migrate`. Always verify on staging before touching production.

```bash
# From repository root
cd lib/db
DATABASE_URL="postgres://staging-host:5432/certen_staging" pnpm migrate
```

Verify the migration applied:

```bash
psql "$DATABASE_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

---

## Production Migration

### Precautions

1. **Backup first** — always take a `pg_dump` before running any migration in production (see Backup section below).
2. **Test on staging** — every migration must be applied and validated on staging before production.
3. **Maintenance window** — for migrations that add or drop columns on high-traffic tables (e.g., `recommendations`, `audit_events`, `outcome_ledger`), schedule a low-traffic window.
4. **One migration at a time** — never skip migration files. Apply them in sequential index order.
5. **Check for locks** — large table alterations may lock rows. Monitor `pg_locks` and `pg_stat_activity` during the migration.

### Production Migration Command

```bash
cd lib/db
DATABASE_URL="$PROD_DATABASE_URL" pnpm migrate
```

For CI/CD pipelines, run from the monorepo root:

```bash
DATABASE_URL="$PROD_DATABASE_URL" COREPACK_ENABLE_PROJECT_SPEC=0 pnpm --filter @workspace/db migrate
```

### Post-Migration Verification

```bash
# Confirm latest migration is recorded
psql "$PROD_DATABASE_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 3;"

# Spot-check critical table structure
psql "$PROD_DATABASE_URL" -c "\d recommendations"
psql "$PROD_DATABASE_URL" -c "\d audit_events"
psql "$PROD_DATABASE_URL" -c "\d outcome_ledger"
```

---

## Backup Requirement

Take a full logical backup with `pg_dump` before every migration. Store the dump file off-box (e.g., S3 or GCS).

```bash
# Full logical backup
pg_dump \
  --format=custom \
  --compress=9 \
  --no-acl \
  --no-owner \
  "$DATABASE_URL" \
  > "backup_$(date +%Y%m%d_%H%M%S).dump"

# Verify the dump is readable
pg_restore --list backup_*.dump | head -20
```

For critical tables, you can also snapshot specific tables:

```bash
pg_dump \
  --format=custom \
  --table=recommendations \
  --table=audit_events \
  --table=outcome_ledger \
  "$DATABASE_URL" \
  > "pre_migration_critical_tables_$(date +%Y%m%d_%H%M%S).dump"
```

---

## Rollback Strategy

Drizzle ORM does not generate automatic down migrations. The rollback strategy depends on the type of change.

### Option 1: Point-in-Time Restore (preferred for destructive migrations)

If the database is hosted on a managed provider (AWS RDS, GCP Cloud SQL, Supabase, etc.), use point-in-time recovery (PITR) to restore to the timestamp just before the migration ran.

```
# AWS RDS example (replace values):
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier prod-db \
  --target-db-instance-identifier prod-db-rollback \
  --restore-time "2025-05-22T09:00:00Z"
```

### Option 2: Restore from pg_dump backup

```bash
# Restore a custom-format dump to a new database (test first)
pg_restore \
  --dbname="$ROLLBACK_DATABASE_URL" \
  --clean \
  --no-acl \
  --no-owner \
  backup_20250522_090000.dump
```

### Option 3: Manual down migration

For additive migrations (new columns or new tables only), write and apply a manual SQL down script:

```bash
# Example: revert a new column
psql "$DATABASE_URL" -c "ALTER TABLE my_table DROP COLUMN IF EXISTS new_column;"

# Example: drop a new table
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS new_table;"

# After reverting, remove the journal entry so drizzle-kit does not re-apply
# Edit lib/db/drizzle/meta/_journal.json and remove the last entry
```

---

## Schema Drift Detection

Drift occurs when the live database schema diverges from the TypeScript schema definitions.

### Detect drift with drizzle-kit introspect

```bash
cd lib/db
DATABASE_URL="$DATABASE_URL" npx drizzle-kit introspect
```

This generates `drizzle/schema.ts` representing what is actually in the database. Compare it against `src/schema/` to find differences.

### Detect drift with drizzle-kit push (dry run)

```bash
DATABASE_URL="$DATABASE_URL" npx drizzle-kit push --dry-run
```

This shows what SQL would be applied without executing it. If output is empty, the database matches the schema.

### Manual comparison

```bash
# Dump current DB schema
pg_dump --schema-only "$DATABASE_URL" > current_db_schema.sql

# Then diff against the generated migration baseline
diff current_db_schema.sql lib/db/drizzle/0000_tranquil_madrox.sql
```

---

## Adding Future Migrations

When schema changes are made to any file in `lib/db/src/schema/`:

1. Make the TypeScript schema change (add/remove column, table, index, etc.).
2. Run `pnpm generate` from `lib/db/` to produce a new migration file.
3. Verify the generated SQL in `lib/db/drizzle/<idx>_<tag>.sql` is correct.
4. Commit the migration file alongside the schema change — never commit one without the other.
5. Apply with `pnpm migrate` on staging, then production.

```bash
# Full workflow example
cd lib/db

# 1. Edit a schema file
# vim src/schema/recommendations.ts

# 2. Generate the migration
DATABASE_URL="postgres://localhost:5432/certen_dev" pnpm generate

# 3. Review the generated SQL
cat drizzle/<new_file>.sql

# 4. Apply to local DB
DATABASE_URL="postgres://localhost:5432/certen_dev" pnpm migrate

# 5. Commit both schema change and migration file
cd ../..
git add lib/db/src/schema/recommendations.ts lib/db/drizzle/
git commit -m "db: add <column> to recommendations"
```

---

## Migration File Layout

```
lib/db/
  drizzle.config.ts                  # Drizzle-kit configuration
  drizzle/
    0000_tranquil_madrox.sql         # Baseline migration (all 92 tables)
    meta/
      _journal.json                  # Migration history index
      0000_snapshot.json             # Schema snapshot for drift detection
```

---

## Critical Tables Reference

The following tables are load-bearing for the CostOps runtime. Exercise extra caution when migrating these.

| Table | Purpose | Risk Level |
|---|---|---|
| `recommendations` | Core recommendation records (52 cols) | HIGH |
| `audit_events` | Immutable audit trail (bigserial PK) | HIGH |
| `outcome_ledger` | Savings realization ledger | HIGH |
| `execution_orchestration_plans` | Execution pipeline state | HIGH |
| `execution_queue_items` | Per-action execution queue | HIGH |
| `approval_requests` / `approval_events` | Approval workflow | HIGH |
| `auth_users` / `auth_sessions` | Authentication | HIGH |
| `economic_operations_execution_state` | Idempotent execution state | HIGH |
| `governance_policies` | Policy engine definitions | MEDIUM |
| `distributed_locks` | Distributed locking | MEDIUM |
| `sync_checkpoints` | Connector sync cursors | MEDIUM |
| `m365_users` | M365 user evidence (unique index) | MEDIUM |

---

## Drizzle Studio (Local Inspection)

To visually browse the database schema and data locally:

```bash
cd lib/db
DATABASE_URL="postgres://localhost:5432/certen_dev" pnpm studio
```

Opens a browser-based UI at `https://local.drizzle.studio`.
