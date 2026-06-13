create table if not exists certen_persisted_records (
  id text not null,
  tenant_id text not null,
  collection text not null,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, collection, id)
);

create index if not exists certen_persisted_records_collection_idx
  on certen_persisted_records (tenant_id, collection);

create index if not exists certen_persisted_records_updated_idx
  on certen_persisted_records (tenant_id, collection, updated_at);
