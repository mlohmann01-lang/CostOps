CREATE TABLE "connector_sync_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"connector" text NOT NULL,
	"last_sync_time" timestamp with time zone NOT NULL,
	"connector_health" text NOT NULL,
	"data_freshness_score" real NOT NULL,
	"freshness_band" text NOT NULL,
	"partial_data" text DEFAULT 'false' NOT NULL,
	"error_code" text,
	"error_message" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_sync" timestamp with time zone,
	"record_count" integer DEFAULT 0 NOT NULL,
	"trust_score" real DEFAULT 0.85 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"user_email" text NOT NULL,
	"display_name" text NOT NULL,
	"licence_sku" text NOT NULL,
	"monthly_cost" real NOT NULL,
	"annualised_cost" real NOT NULL,
	"pricing_confidence" text DEFAULT 'UNKNOWN' NOT NULL,
	"pricing_source" text DEFAULT '' NOT NULL,
	"trust_score" real NOT NULL,
	"entity_trust_score" real DEFAULT 0 NOT NULL,
	"recommendation_trust_score" real DEFAULT 0 NOT NULL,
	"execution_readiness_score" real DEFAULT 0 NOT NULL,
	"execution_status" text NOT NULL,
	"critical_blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"playbook" text NOT NULL,
	"playbook_id" text DEFAULT '' NOT NULL,
	"playbook_name" text DEFAULT '' NOT NULL,
	"playbook_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"playbook_required_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"playbook_exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluation_event_id" text DEFAULT '' NOT NULL,
	"connector" text NOT NULL,
	"ingestion_run_id" text DEFAULT '' NOT NULL,
	"source_timestamp" timestamp with time zone,
	"connector_health" text DEFAULT 'HEALTHY' NOT NULL,
	"data_freshness_score" real DEFAULT 1 NOT NULL,
	"freshness_band" text DEFAULT '0_7' NOT NULL,
	"partial_data" text DEFAULT 'false' NOT NULL,
	"connector_health_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_activity" timestamp with time zone,
	"days_since_activity" integer,
	"rejection_reason" text,
	"action_type" text DEFAULT '' NOT NULL,
	"target_entity_id" text DEFAULT '' NOT NULL,
	"target_entity_type" text DEFAULT 'USER' NOT NULL,
	"evidence_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trust_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_monthly_saving" real DEFAULT 0 NOT NULL,
	"expected_annual_saving" real DEFAULT 0 NOT NULL,
	"recommendation_risk_class" text DEFAULT 'B' NOT NULL,
	"recommendation_execution_mode" text DEFAULT 'APPROVAL_REQUIRED' NOT NULL,
	"recommendation_verification_method" text DEFAULT '' NOT NULL,
	"rollback_notes" text DEFAULT '' NOT NULL,
	"recommendation_status" text DEFAULT 'CANDIDATE' NOT NULL,
	"latest_rationale_id" text DEFAULT '' NOT NULL,
	"correlation_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outcome_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"recommendation_id" integer NOT NULL,
	"user_email" text NOT NULL,
	"display_name" text NOT NULL,
	"action" text NOT NULL,
	"licence_sku" text NOT NULL,
	"before_cost" real DEFAULT 0 NOT NULL,
	"after_cost" real DEFAULT 0 NOT NULL,
	"monthly_saving" real NOT NULL,
	"annualised_saving" real NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"executed" boolean DEFAULT false NOT NULL,
	"execution_mode" text DEFAULT 'SIMULATED' NOT NULL,
	"playbook_id" text DEFAULT '' NOT NULL,
	"playbook_name" text DEFAULT '' NOT NULL,
	"action_risk_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trust_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"before_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"after_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dry_run_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"execution_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pricing_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pricing_confidence" text DEFAULT 'UNKNOWN' NOT NULL,
	"pricing_source" text DEFAULT '' NOT NULL,
	"saving_confidence" text DEFAULT 'ESTIMATED' NOT NULL,
	"actor_id" text DEFAULT 'system' NOT NULL,
	"execution_status" text DEFAULT 'EXECUTED' NOT NULL,
	"idempotency_key" text,
	"approved_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drift_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"recommendation_id" text NOT NULL,
	"outcome_ledger_id" integer NOT NULL,
	"user_principal_name" text NOT NULL,
	"action" text NOT NULL,
	"drift_type" text NOT NULL,
	"drift_status" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_evaluation_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"ingestion_run_id" text NOT NULL,
	"playbook_id" text NOT NULL,
	"playbook_name" text NOT NULL,
	"candidate_type" text NOT NULL,
	"candidate_id" text NOT NULL,
	"candidate_display_name" text DEFAULT '' NOT NULL,
	"matched" text DEFAULT 'false' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"recommended_action" text DEFAULT '' NOT NULL,
	"exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "m365_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"source_object_id" text NOT NULL,
	"user_principal_name" text NOT NULL,
	"display_name" text,
	"account_enabled" text NOT NULL,
	"assigned_licenses" jsonb NOT NULL,
	"last_login_days_ago" integer,
	"source_timestamp" timestamp with time zone NOT NULL,
	"ingestion_run_id" text NOT NULL,
	"connector_health" text NOT NULL,
	"data_freshness_score" real NOT NULL,
	"freshness_band" text NOT NULL,
	"partial_data" text DEFAULT 'false' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "m365_sku_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku_id" text NOT NULL,
	"sku_part_number" text NOT NULL,
	"product_name" text NOT NULL,
	"service_plans" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"region" text DEFAULT 'US' NOT NULL,
	"list_price_monthly" real NOT NULL,
	"list_price_annual" real NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"source" text DEFAULT 'PUBLIC' NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_drift_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"sku_id" text NOT NULL,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'MEDIUM' NOT NULL,
	"prior_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_evidence_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"sku_id" text NOT NULL,
	"sku_part_number" text,
	"evidence_source" text NOT NULL,
	"pricing_source" text NOT NULL,
	"pricing_confidence" text NOT NULL,
	"effective_monthly_cost" real NOT NULL,
	"effective_annual_cost" real NOT NULL,
	"currency" text NOT NULL,
	"action" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"evidence_id" text,
	"evidence_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sku_identity_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_sku_id" text NOT NULL,
	"source_system" text NOT NULL,
	"source_sku_id" text NOT NULL,
	"source_sku_name" text,
	"active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_sku_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"sku_id" text NOT NULL,
	"canonical_sku_id" text DEFAULT '' NOT NULL,
	"sku_aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pricing_source" text NOT NULL,
	"effective_monthly_cost" real NOT NULL,
	"effective_annual_cost" real NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"original_currency" text DEFAULT 'USD' NOT NULL,
	"original_monthly_cost" real DEFAULT 0 NOT NULL,
	"original_annual_cost" real DEFAULT 0 NOT NULL,
	"fx_rate_used" real DEFAULT 1 NOT NULL,
	"fx_rate_source" text DEFAULT 'NONE' NOT NULL,
	"fx_timestamp" timestamp with time zone,
	"pricing_confidence" text DEFAULT 'UNKNOWN' NOT NULL,
	"evidence_source" text DEFAULT 'MANUAL_IMPORT' NOT NULL,
	"evidence_id" text,
	"evidence_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"derived_from" text DEFAULT '' NOT NULL,
	"contract_start" timestamp with time zone,
	"contract_end" timestamp with time zone,
	"approval_required" text DEFAULT 'false' NOT NULL,
	"approved_by" text,
	"last_validated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flexera_entitlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"source_object_id" text NOT NULL,
	"user_principal_name" text,
	"product_name" text NOT NULL,
	"sku_id" text,
	"sku_part_number" text,
	"entitlement_quantity" integer NOT NULL,
	"consumed_quantity" integer,
	"cost" real,
	"currency" text,
	"contract_id" text,
	"source_timestamp" timestamp with time zone NOT NULL,
	"ingestion_run_id" text NOT NULL,
	"connector_health" text NOT NULL,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicenow_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"source_object_id" text NOT NULL,
	"asset_tag" text,
	"assigned_to" text,
	"user_principal_name" text,
	"department" text,
	"cost_center" text,
	"owner" text,
	"status" text,
	"contract_id" text,
	"source_timestamp" timestamp with time zone NOT NULL,
	"ingestion_run_id" text NOT NULL,
	"connector_health" text NOT NULL,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicenow_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"source_object_id" text NOT NULL,
	"vendor" text NOT NULL,
	"contract_number" text,
	"product_name" text,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"annual_cost" real,
	"currency" text,
	"owner" text,
	"source_timestamp" timestamp with time zone NOT NULL,
	"ingestion_run_id" text NOT NULL,
	"connector_health" text NOT NULL,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"finding_type" text NOT NULL,
	"severity" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_key" text NOT NULL,
	"sources_involved" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rollback_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"original_outcome_ledger_id" text NOT NULL,
	"recommendation_id" text DEFAULT '' NOT NULL,
	"rollback_action" text NOT NULL,
	"actor_id" text NOT NULL,
	"status" text DEFAULT 'EXECUTED' NOT NULL,
	"idempotency_key" text NOT NULL,
	"before_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"after_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"execution_mode" text DEFAULT 'SIMULATED' NOT NULL,
	"graph_request_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rollback_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "dead_letter_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_run_id" text NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"job_type" text NOT NULL,
	"reason" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheduled_job_id" integer,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"records_succeeded" integer DEFAULT 0 NOT NULL,
	"records_failed" integer DEFAULT 0 NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"job_type" text NOT NULL,
	"job_name" text NOT NULL,
	"enabled" text DEFAULT 'true' NOT NULL,
	"schedule_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outcome_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"outcome_ledger_id" integer NOT NULL,
	"recommendation_id" text NOT NULL,
	"verification_status" text NOT NULL,
	"verification_confidence" text NOT NULL,
	"verification_source" text NOT NULL,
	"projected_monthly_saving" real NOT NULL,
	"verified_monthly_saving" real,
	"variance_amount" real,
	"variance_pct" real,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"approval_request_id" integer NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"actor_id" text NOT NULL,
	"event_type" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"recommendation_id" text NOT NULL,
	"requested_by" text NOT NULL,
	"required_approver_role" text DEFAULT 'APPROVER' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"risk_class" text DEFAULT 'B' NOT NULL,
	"action" text DEFAULT 'REMOVE_LICENSE' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"policy_key" text NOT NULL,
	"policy_name" text NOT NULL,
	"policy_category" text DEFAULT 'GENERAL' NOT NULL,
	"policy_status" text DEFAULT 'DRAFT' NOT NULL,
	"policy_version" text DEFAULT 'v1' NOT NULL,
	"scope_type" text DEFAULT 'TENANT' NOT NULL,
	"scope_entity_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"policy_definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"policy_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"deprecated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "policy_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"policy_id" integer,
	"recommendation_id" text,
	"outcome_ledger_id" integer,
	"actor_id" text,
	"decision" text NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_exception_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"exception_id" integer NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"actor_id" text NOT NULL,
	"event_type" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"exception_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"recommendation_id" text,
	"policy_id" integer,
	"requested_by" text NOT NULL,
	"approved_by" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"reason" text NOT NULL,
	"business_justification" text DEFAULT '' NOT NULL,
	"risk_accepted" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovered_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"app_key" text NOT NULL,
	"display_name" text NOT NULL,
	"vendor" text NOT NULL,
	"category" text,
	"source_systems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owner" text,
	"department" text,
	"cost_center" text,
	"contract_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"entitlement_count" integer DEFAULT 0 NOT NULL,
	"user_count" integer DEFAULT 0 NOT NULL,
	"monthly_cost" real,
	"annual_cost" real,
	"discovery_confidence" real DEFAULT 0 NOT NULL,
	"onboarding_confidence" real DEFAULT 0 NOT NULL,
	"priority_score" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'DISCOVERED' NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlement_ownership_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"app_key" text NOT NULL,
	"user_principal_name" text,
	"entitlement_id" text,
	"sku_id" text,
	"sku_part_number" text,
	"source_system" text NOT NULL,
	"owner" text,
	"department" text,
	"cost_center" text,
	"confidence" real NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metadata_mapping_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"mapping_type" text NOT NULL,
	"source_value" text NOT NULL,
	"canonical_value" text NOT NULL,
	"confidence" real NOT NULL,
	"source_systems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operationalization_pack_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pack_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"app_key" text,
	"message" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operationalization_packs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pack_type" text NOT NULL,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"onboarding_confidence" real DEFAULT 0 NOT NULL,
	"readiness_score" real DEFAULT 0 NOT NULL,
	"apps_total" integer DEFAULT 0 NOT NULL,
	"apps_ready" integer DEFAULT 0 NOT NULL,
	"apps_blocked" integer DEFAULT 0 NOT NULL,
	"blockers_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recommendations_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"session_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"auth_provider" text NOT NULL,
	"external_subject_id" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_onboarding" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"current_step" text DEFAULT 'TENANT_SETUP' NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"connector_statuses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"readiness_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"onboarding_status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"event_type" text NOT NULL,
	"severity" text NOT NULL,
	"source" text NOT NULL,
	"correlation_id" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"message" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_type" text NOT NULL,
	"tenant_id" text,
	"source" text NOT NULL,
	"value" real NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"metric_type" text NOT NULL,
	"duration" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'OK' NOT NULL,
	"correlation_id" text NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"metric_type" text NOT NULL,
	"duration" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'OK' NOT NULL,
	"correlation_id" text NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"metric_type" text NOT NULL,
	"duration" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'OK' NOT NULL,
	"correlation_id" text NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprise_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_key" text NOT NULL,
	"display_name" text,
	"confidence" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprise_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"from_entity_key" text NOT NULL,
	"to_entity_key" text NOT NULL,
	"relationship_type" text NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_key" text NOT NULL,
	"source" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_resolution_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_key" text NOT NULL,
	"event_type" text NOT NULL,
	"message" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_automation_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"action_type" text NOT NULL,
	"playbook_id" text,
	"target_entity_type" text NOT NULL,
	"current_mode" text DEFAULT 'RECOMMEND_ONLY' NOT NULL,
	"recommended_mode" text DEFAULT 'RECOMMEND_ONLY' NOT NULL,
	"promotion_status" text DEFAULT 'NOT_ELIGIBLE' NOT NULL,
	"successful_runs" integer DEFAULT 0 NOT NULL,
	"failed_runs" integer DEFAULT 0 NOT NULL,
	"verified_sample_batches" integer DEFAULT 0 NOT NULL,
	"failure_rate_percent" real DEFAULT 0 NOT NULL,
	"last_runtime_block_at" timestamp with time zone,
	"last_critical_escalation_at" timestamp with time zone,
	"blast_radius_band" text DEFAULT 'LOW' NOT NULL,
	"risk_class" text DEFAULT 'A' NOT NULL,
	"rollback_available" boolean DEFAULT false NOT NULL,
	"promotion_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_batch_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"batch_id" integer NOT NULL,
	"queue_item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" integer NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"readiness" text DEFAULT 'NOT_READY' NOT NULL,
	"failure_policy" text DEFAULT 'PAUSE_ON_THRESHOLD' NOT NULL,
	"blast_radius_score" real DEFAULT 0 NOT NULL,
	"blast_radius_band" text,
	"risk_class_max" text,
	"is_sample_batch" boolean DEFAULT false NOT NULL,
	"parent_batch_id" integer,
	"sample_batch_status" text,
	"sample_outcome_verified" boolean DEFAULT false NOT NULL,
	"promotion_eligible" boolean DEFAULT false NOT NULL,
	"last_evaluated_at" timestamp with time zone,
	"cooldown_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "execution_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" integer NOT NULL,
	"queue_item_id" integer NOT NULL,
	"depends_on_queue_item_id" integer NOT NULL,
	"dependency_type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "execution_escalations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" integer NOT NULL,
	"queue_item_id" integer,
	"escalation_type" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"reason" text NOT NULL,
	"assigned_role" text,
	"assigned_actor_id" text,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_orchestration_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" integer,
	"queue_item_id" integer,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"actor_id" text,
	"source" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_orchestration_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"workflow_id" text,
	"source_recommendation_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"playbook_id" text,
	"plan_type" text NOT NULL,
	"status" text NOT NULL,
	"risk_class_max" text,
	"blast_radius_score" real DEFAULT 0 NOT NULL,
	"blast_radius_band" text,
	"automation_eligibility" text,
	"approval_required" boolean DEFAULT false NOT NULL,
	"runtime_control_status" text DEFAULT 'ALLOW' NOT NULL,
	"created_by_actor_id" text NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"failure_reason" text,
	"evidence_ref" text,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_outcome_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"outcome_ledger_id" text NOT NULL,
	"plan_id" integer NOT NULL,
	"queue_item_id" integer NOT NULL,
	"batch_id" integer,
	"action_type" text NOT NULL,
	"target_entity_id" text NOT NULL,
	"expected_outcome" text NOT NULL,
	"expected_monthly_saving" real DEFAULT 0 NOT NULL,
	"expected_annual_saving" real DEFAULT 0 NOT NULL,
	"actual_outcome" text,
	"actual_monthly_saving" real,
	"actual_annual_saving" real,
	"verification_status" text DEFAULT 'PENDING' NOT NULL,
	"verification_method" text DEFAULT 'LEDGER_ONLY' NOT NULL,
	"verification_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"drift_detected" boolean DEFAULT false NOT NULL,
	"rollback_recommended" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_queue_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" integer NOT NULL,
	"workflow_step_id" text,
	"recommendation_id" text NOT NULL,
	"action_type" text NOT NULL,
	"target_entity_id" text NOT NULL,
	"target_entity_type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"sequence_index" integer DEFAULT 0 NOT NULL,
	"dependency_group" text,
	"batch_group" text,
	"risk_class" text NOT NULL,
	"execution_mode" text DEFAULT 'APPROVAL_EXECUTE' NOT NULL,
	"approval_status" text DEFAULT 'NOT_REQUIRED' NOT NULL,
	"runtime_control_status" text DEFAULT 'ALLOW' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"execution_result" jsonb,
	"failure_reason" text,
	"rollback_available" boolean DEFAULT false NOT NULL,
	"outcome_ledger_id" text,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppressed_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"playbook_id" text NOT NULL,
	"target_entity_id" text NOT NULL,
	"reason_code" text NOT NULL,
	"reason_text" text DEFAULT '' NOT NULL,
	"evidence_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_governance_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"policy_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"policy_type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"max_auto_safe_risk_class" text,
	"max_auto_safe_blast_radius" text,
	"requires_approval_risk_class" text,
	"requires_sample_batch_blast_radius" text,
	"max_batch_failure_rate_percent" real,
	"max_batch_size" integer,
	"max_annualized_savings_without_approval" real,
	"allow_automation_promotion" boolean DEFAULT true NOT NULL,
	"allow_auto_safe_execution" boolean DEFAULT true NOT NULL,
	"allow_rollback_recommendation" boolean DEFAULT true NOT NULL,
	"restricted_action_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"restricted_playbooks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"restricted_target_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_approvals" integer DEFAULT 1 NOT NULL,
	"runtime_control_overrides_allowed" boolean DEFAULT false NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"updated_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"approval_type" text NOT NULL,
	"required_approvals" integer DEFAULT 1 NOT NULL,
	"current_approvals" integer DEFAULT 0 NOT NULL,
	"approval_status" text DEFAULT 'PENDING' NOT NULL,
	"requested_by" text NOT NULL,
	"approved_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rejected_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "m365_connector_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"provider_tenant_id" text NOT NULL,
	"client_id" text NOT NULL,
	"encrypted_client_secret_ref" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mode" text DEFAULT 'READ_ONLY' NOT NULL,
	"status" text DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"last_validated_at" timestamp with time zone,
	"last_sync_started_at" timestamp with time zone,
	"last_sync_completed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "m365_evidence_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"source_system" text DEFAULT 'M365_GRAPH' NOT NULL,
	"source_record_id" text NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"department" text,
	"cost_centre" text,
	"assigned_licences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"monthly_licence_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone,
	"account_status" text DEFAULT 'UNKNOWN' NOT NULL,
	"mailbox_type" text DEFAULT 'user' NOT NULL,
	"copilot_activity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"add_on_usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"desktop_app_usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_service_account" boolean DEFAULT false NOT NULL,
	"evidence_completeness" numeric(5, 2) DEFAULT '0' NOT NULL,
	"evidence_freshness" numeric(5, 2) DEFAULT '0' NOT NULL,
	"raw_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_trust_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"connector_type" text NOT NULL,
	"connector_id" text NOT NULL,
	"source_system" text NOT NULL,
	"sync_run_id" text NOT NULL,
	"trust_score" numeric(5, 2) NOT NULL,
	"trust_band" text NOT NULL,
	"freshness_score" numeric(5, 2) NOT NULL,
	"completeness_score" numeric(5, 2) NOT NULL,
	"consistency_score" numeric(5, 2) NOT NULL,
	"identity_match_score" numeric(5, 2) NOT NULL,
	"source_reliability_score" numeric(5, 2) NOT NULL,
	"critical_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warning_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_reconciliation_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"connector_type" text NOT NULL,
	"source_system" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"finding_type" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"description" text NOT NULL,
	"evidence_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recommended_resolution" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recommendation_rationales" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"connector_type" text DEFAULT 'm365' NOT NULL,
	"playbook_id" text NOT NULL,
	"playbook_name" text NOT NULL,
	"recommendation_status" text NOT NULL,
	"trust_band" text DEFAULT 'MEDIUM' NOT NULL,
	"overall_trust_score" real DEFAULT 0 NOT NULL,
	"projected_savings_monthly" real DEFAULT 0 NOT NULL,
	"projected_savings_annualized" real DEFAULT 0 NOT NULL,
	"projected_savings_confidence" text DEFAULT 'MEDIUM' NOT NULL,
	"why_generated" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"why_safe" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"why_blocked" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"why_downgraded" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trust_factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reconciliation_factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"governance_factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"runtime_factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"projected_savings_factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_lineage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_record_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"connector_trust_snapshot_id" text DEFAULT '' NOT NULL,
	"explainability_version" text DEFAULT 'checkpoint-24-v1' NOT NULL,
	"deterministic_hash" text NOT NULL,
	"reasoning_schema_version" text DEFAULT 'rationale-schema-v1' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_decision_traces" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"recommendation_rationale_id" text NOT NULL,
	"stage" text NOT NULL,
	"stage_order" text NOT NULL,
	"outcome" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"blocking" text DEFAULT 'false' NOT NULL,
	"warning" text DEFAULT 'false' NOT NULL,
	"source_evidence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"connector_trust_snapshot_id" text DEFAULT '' NOT NULL,
	"reconciliation_finding_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decision_engine_version" text DEFAULT 'decision-engine-v1' NOT NULL,
	"trace_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"recommendation_rationale_id" text DEFAULT '' NOT NULL,
	"connector_type" text DEFAULT 'm365' NOT NULL,
	"playbook_id" text DEFAULT '' NOT NULL,
	"outcome_status" text DEFAULT 'PENDING' NOT NULL,
	"projected_monthly_savings" real DEFAULT 0 NOT NULL,
	"projected_annualized_savings" real DEFAULT 0 NOT NULL,
	"realized_monthly_savings" real DEFAULT 0 NOT NULL,
	"realized_annualized_savings" real DEFAULT 0 NOT NULL,
	"realization_delta" real DEFAULT 0 NOT NULL,
	"realization_delta_percent" real DEFAULT 0 NOT NULL,
	"resolution_confidence" text DEFAULT 'LOW' NOT NULL,
	"confidence_calibration" text DEFAULT 'CONFIDENCE_UNVERIFIED' NOT NULL,
	"resolution_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connector_evidence_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcome_ledger_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"post_resolution_lineage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"drift_detected" boolean DEFAULT false NOT NULL,
	"reversal_detected" boolean DEFAULT false NOT NULL,
	"drift_reason" text,
	"reversal_reason" text,
	"resolution_engine_version" text DEFAULT 'outcome-resolution-v1' NOT NULL,
	"deterministic_hash" text NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_simulations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"simulation_name" text NOT NULL,
	"connector_type" text DEFAULT 'm365' NOT NULL,
	"simulation_scope" text NOT NULL,
	"scope_entity_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"simulation_status" text DEFAULT 'PENDING' NOT NULL,
	"projected_monthly_savings" numeric(12, 2) DEFAULT '0' NOT NULL,
	"projected_annualized_savings" numeric(12, 2) DEFAULT '0' NOT NULL,
	"projected_affected_users" numeric(10, 0) DEFAULT '0' NOT NULL,
	"projected_affected_groups" numeric(10, 0) DEFAULT '0' NOT NULL,
	"projected_affected_licenses" numeric(10, 0) DEFAULT '0' NOT NULL,
	"blast_radius_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"reversibility_risk_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"governance_risk_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"trust_risk_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"predicted_realization_confidence" text DEFAULT 'MEDIUM' NOT NULL,
	"predicted_drift_risk" numeric(5, 2) DEFAULT '0' NOT NULL,
	"predicted_reversal_risk" numeric(5, 2) DEFAULT '0' NOT NULL,
	"simulation_reasoning" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"governance_reasoning" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trust_reasoning" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"blast_radius_reasoning" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deterministic_hash" text NOT NULL,
	"simulation_engine_version" text DEFAULT 'policy-sim-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_arbitration_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"playbook_id" text DEFAULT '' NOT NULL,
	"connector_type" text DEFAULT 'm365' NOT NULL,
	"priority_score" real DEFAULT 0 NOT NULL,
	"priority_band" text DEFAULT 'LOW' NOT NULL,
	"projected_savings_score" real DEFAULT 0 NOT NULL,
	"trust_score" real DEFAULT 0 NOT NULL,
	"governance_risk_score" real DEFAULT 0 NOT NULL,
	"blast_radius_score" real DEFAULT 0 NOT NULL,
	"reversibility_score" real DEFAULT 0 NOT NULL,
	"realization_confidence_score" real DEFAULT 0 NOT NULL,
	"drift_risk_score" real DEFAULT 0 NOT NULL,
	"reversal_risk_score" real DEFAULT 0 NOT NULL,
	"urgency_score" real DEFAULT 0 NOT NULL,
	"arbitration_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suppression_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conflict_group_id" text,
	"deduplication_group_id" text,
	"arbitration_engine_version" text DEFAULT 'recommendation-arbitration-v1' NOT NULL,
	"deterministic_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"canonical_name" text NOT NULL,
	"canonical_key" text NOT NULL,
	"source_system" text NOT NULL,
	"entity_confidence_score" real DEFAULT 0 NOT NULL,
	"entity_trust_score" real DEFAULT 0 NOT NULL,
	"is_orphaned" boolean DEFAULT false NOT NULL,
	"is_duplicate_candidate" boolean DEFAULT false NOT NULL,
	"source_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_entity_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"from_entity_id" text NOT NULL,
	"to_entity_id" text NOT NULL,
	"relationship_type" text NOT NULL,
	"relationship_confidence_score" real DEFAULT 0 NOT NULL,
	"relationship_trust_score" real DEFAULT 0 NOT NULL,
	"source_system" text NOT NULL,
	"source_reference_id" text DEFAULT '' NOT NULL,
	"edge_provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"edge_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_correlation_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"correlation_type" text NOT NULL,
	"correlated_entity_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correlation_confidence" real DEFAULT 0 NOT NULL,
	"correlation_reasoning" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deterministic_hash" text NOT NULL,
	"correlation_engine_version" text DEFAULT 'entity-correlation-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_policy_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"policy_id" text NOT NULL,
	"policy_version" text NOT NULL,
	"evaluation_target_type" text NOT NULL,
	"evaluation_target_id" text NOT NULL,
	"evaluation_outcome" text NOT NULL,
	"evaluation_reasoning" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluation_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"simulation_compatible" text DEFAULT 'true' NOT NULL,
	"deterministic_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_health_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"connector_type" text NOT NULL,
	"health_status" text NOT NULL,
	"availability_score" numeric NOT NULL,
	"latency_score" numeric NOT NULL,
	"freshness_score" numeric NOT NULL,
	"trust_score" numeric NOT NULL,
	"rate_limit_events" integer DEFAULT 0 NOT NULL,
	"retry_events" integer DEFAULT 0 NOT NULL,
	"failed_requests" integer DEFAULT 0 NOT NULL,
	"last_successful_sync" timestamp with time zone,
	"last_failed_sync" timestamp with time zone,
	"health_reasoning" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_activity_stream" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"policy_version" text NOT NULL,
	"evaluation_outcome" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"evaluation_latency_ms" integer NOT NULL,
	"simulation_mode" text DEFAULT 'LIVE' NOT NULL,
	"governance_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"source_system" text NOT NULL,
	"source_component" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"event_severity" text NOT NULL,
	"event_status" text NOT NULL,
	"event_message" text NOT NULL,
	"failure_category" text,
	"event_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text NOT NULL,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operator_activity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"operator_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"activity_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"workflow_item_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"decision" text NOT NULL,
	"decision_reason" text NOT NULL,
	"decided_by" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"policy_version" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"exception_status" text DEFAULT 'REQUESTED' NOT NULL,
	"exception_reason" text NOT NULL,
	"expiry_at" timestamp with time zone NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"workflow_item_id" text NOT NULL,
	"assignee_id" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assignment_reason" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"workflow_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"priority_band" text DEFAULT 'MEDIUM' NOT NULL,
	"due_at" timestamp with time zone,
	"sla_status" text DEFAULT 'HEALTHY' NOT NULL,
	"assigned_team" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_profiles" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"enabled_connectors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled_playbooks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_trust_thresholds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approval_requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"telemetry_retention_days" text DEFAULT '30' NOT NULL,
	"workflow_sla_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"policy_exception_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"demo_mode" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_operations_action_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"intent_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_role" text NOT NULL,
	"source_surface" text NOT NULL,
	"result_state" text NOT NULL,
	"previous_state" text NOT NULL,
	"next_state" text NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"proof_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ledger_entry_id" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_operations_drift_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"outcome_ledger_id" text,
	"drift_status" text NOT NULL,
	"drift_type" text NOT NULL,
	"severity" text NOT NULL,
	"reason" text,
	"evidence_hash" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_operations_execution_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"provider" text NOT NULL,
	"playbook_id" text NOT NULL,
	"current_state" text NOT NULL,
	"previous_state" text NOT NULL,
	"approval_status" text NOT NULL,
	"simulation_status" text NOT NULL,
	"execution_status" text NOT NULL,
	"verification_status" text NOT NULL,
	"rollback_status" text NOT NULL,
	"drift_status" text NOT NULL,
	"last_intent_type" text,
	"last_state_transition_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "econ_ops_execution_state_tenant_exec_unique" UNIQUE("tenant_id","execution_id")
);
--> statement-breakpoint
CREATE TABLE "economic_operations_idempotency" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"intent_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"result_state" text NOT NULL,
	"result_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "econ_ops_idempotency_unique" UNIQUE("tenant_id","execution_id","intent_type","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "economic_operations_rollback_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"rollback_readiness_state" text NOT NULL,
	"rollback_status" text NOT NULL,
	"reason" text,
	"removed_sku_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rollback_sku_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_status" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_operations_verification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"recommendation_id" text NOT NULL,
	"verification_status" text NOT NULL,
	"verification_reason" text,
	"evidence_hash" text NOT NULL,
	"source_of_truth" text NOT NULL,
	"current_assigned_sku_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"removed_sku_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"account_enabled" text,
	"evidence_freshness" text,
	"verified_saving" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_operations_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"job_type" text NOT NULL,
	"job_key" text NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"locked_by" text,
	"lock_expires_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distributed_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"lock_type" text NOT NULL,
	"locked_by" text NOT NULL,
	"lock_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_checkpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"connector_id" text NOT NULL,
	"sync_type" text NOT NULL,
	"checkpoint_key" text NOT NULL,
	"cursor" text,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"total_estimate" integer,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "econ_ops_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"source" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"dedupe_key" text,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_at" timestamp with time zone,
	"status" text DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operator_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"recommended_action" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_health_model" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"connector_id" text NOT NULL,
	"provider" text NOT NULL,
	"health_state" text DEFAULT 'HEALTHY' NOT NULL,
	"last_successful_sync_at" timestamp with time zone,
	"last_failed_sync_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"rate_limit_until" timestamp with time zone,
	"missing_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"staleness_reason" text,
	"capability_availability" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trust_score" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_role" text DEFAULT 'VIEWER' NOT NULL,
	"event_type" text NOT NULL,
	"resource_type" text DEFAULT 'unknown' NOT NULL,
	"resource_id" text,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcome" text DEFAULT 'SUCCESS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_governance_verification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"verification_id" text NOT NULL,
	"execution_id" text,
	"from_model" text,
	"to_model" text,
	"baseline_tokens" numeric(18, 0),
	"baseline_cost" numeric(12, 4),
	"measured_tokens" numeric(18, 0),
	"measured_cost" numeric(12, 4),
	"realized_savings" numeric(12, 4),
	"realized_savings_percent" numeric(8, 4),
	"status" text DEFAULT 'PENDING' NOT NULL,
	"confidence_level" text DEFAULT 'LOW' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"proof_graph_node_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "token_governance_verification_events_verification_id_unique" UNIQUE("verification_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "m365_users_tenant_object_uniq" ON "m365_users" USING btree ("tenant_id","source_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flexera_entitlements_tenant_object_uniq" ON "flexera_entitlements" USING btree ("tenant_id","source_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "servicenow_assets_tenant_object_uniq" ON "servicenow_assets" USING btree ("tenant_id","source_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "servicenow_contracts_tenant_object_uniq" ON "servicenow_contracts" USING btree ("tenant_id","source_object_id");--> statement-breakpoint
CREATE INDEX "gov_policy_tenant_idx" ON "governance_policies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "gov_policy_key_idx" ON "governance_policies" USING btree ("policy_key");--> statement-breakpoint
CREATE INDEX "gov_policy_version_idx" ON "governance_policies" USING btree ("policy_version");--> statement-breakpoint
CREATE INDEX "gov_policy_status_idx" ON "governance_policies" USING btree ("policy_status");--> statement-breakpoint
CREATE INDEX "recommendation_rationales_tenant_recommendation_idx" ON "recommendation_rationales" USING btree ("tenant_id","recommendation_id");--> statement-breakpoint
CREATE INDEX "recommendation_rationales_tenant_generated_idx" ON "recommendation_rationales" USING btree ("tenant_id","generated_at");--> statement-breakpoint
CREATE INDEX "recommendation_rationales_tenant_status_idx" ON "recommendation_rationales" USING btree ("tenant_id","recommendation_status");--> statement-breakpoint
CREATE INDEX "recommendation_decision_traces_tenant_stage_idx" ON "recommendation_decision_traces" USING btree ("tenant_id","recommendation_id","stage_order");--> statement-breakpoint
CREATE INDEX "recommendation_decision_traces_rationale_idx" ON "recommendation_decision_traces" USING btree ("tenant_id","recommendation_rationale_id");--> statement-breakpoint
CREATE INDEX "recommendation_outcomes_tenant_recommendation_idx" ON "recommendation_outcomes" USING btree ("tenant_id","recommendation_id");--> statement-breakpoint
CREATE INDEX "recommendation_outcomes_tenant_status_idx" ON "recommendation_outcomes" USING btree ("tenant_id","outcome_status");--> statement-breakpoint
CREATE INDEX "recommendation_outcomes_tenant_resolved_idx" ON "recommendation_outcomes" USING btree ("tenant_id","resolved_at");--> statement-breakpoint
CREATE INDEX "policy_simulations_tenant_scope_idx" ON "policy_simulations" USING btree ("tenant_id","simulation_scope");--> statement-breakpoint
CREATE INDEX "policy_simulations_tenant_created_idx" ON "policy_simulations" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "policy_simulations_tenant_status_idx" ON "policy_simulations" USING btree ("tenant_id","simulation_status");--> statement-breakpoint
CREATE INDEX "recommendation_arbitration_tenant_idx" ON "recommendation_arbitration_snapshots" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "recommendation_arbitration_recommendation_idx" ON "recommendation_arbitration_snapshots" USING btree ("recommendation_id");--> statement-breakpoint
CREATE INDEX "recommendation_arbitration_priority_band_idx" ON "recommendation_arbitration_snapshots" USING btree ("priority_band");--> statement-breakpoint
CREATE INDEX "recommendation_arbitration_created_at_idx" ON "recommendation_arbitration_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operational_entities_tenant_idx" ON "operational_entities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "operational_entities_entity_type_idx" ON "operational_entities" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "operational_entities_canonical_key_idx" ON "operational_entities" USING btree ("canonical_key");--> statement-breakpoint
CREATE INDEX "operational_entities_is_orphaned_idx" ON "operational_entities" USING btree ("is_orphaned");--> statement-breakpoint
CREATE INDEX "operational_entity_edges_tenant_idx" ON "operational_entity_edges" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "operational_entity_edges_from_idx" ON "operational_entity_edges" USING btree ("from_entity_id");--> statement-breakpoint
CREATE INDEX "operational_entity_edges_to_idx" ON "operational_entity_edges" USING btree ("to_entity_id");--> statement-breakpoint
CREATE INDEX "operational_entity_edges_relationship_type_idx" ON "operational_entity_edges" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "operational_entity_edges_is_active_idx" ON "operational_entity_edges" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "entity_correlation_snapshots_tenant_idx" ON "entity_correlation_snapshots" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "operational_events_tenant_idx" ON "operational_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "operational_events_category_idx" ON "operational_events" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "operational_events_severity_idx" ON "operational_events" USING btree ("event_severity");--> statement-breakpoint
CREATE INDEX "operational_events_created_idx" ON "operational_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operational_events_correlation_idx" ON "operational_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "approval_decisions_tenant_idx" ON "approval_decisions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "policy_exceptions_tenant_idx" ON "policy_exceptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflow_assignments_tenant_idx" ON "workflow_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflow_items_tenant_idx" ON "workflow_items" USING btree ("tenant_id");