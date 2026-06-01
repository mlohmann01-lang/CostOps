# VCDE v2 Gap Report

## Existing VCDE components reused

- `VendorChangeRepository` remains the VCDE change authority and now supports classifier fields, evidence references, hash-aware dedupe, patch updates, and seeded compatibility changes.
- `impact-assessment-engine.ts` remains the impact engine and now emits richer `VendorChangeImpact` fields including affected domains/platforms/entities, estimated impact, confidence, and reasons.
- `opportunity-generation-engine.ts` remains the VCDE opportunity input generator used only by the Opportunity Factory provider.
- `/api/vendor-changes` remains the VCDE API owner and now exposes signal, classifier, assessment, promotion, and pipeline health surfaces.

## New ingestion components

- `vendor-signal-types.ts` defines `VendorSignal`.
- `vendor-signal-repository.ts` stores tenant-scoped signals and hash indexes.
- `vendor-signal-ingestion-service.ts` ingests manual/test signals, hashes vendor/source/title/text, detects duplicates, retains evidence URL, and emits `VENDOR_SIGNAL_INGESTED` / dedupe events through Platform Event Authority.

## Classification rules

The deterministic classifier is keyword based and has no LLM dependency:

- `price increase`, `pricing update`, `price change` -> `PRICE_CHANGE`
- `retirement`, `end of support`, `EOL` -> `RETIREMENT`
- `new bundle`, `packaging update` -> `BUNDLE_CHANGE`
- `licensing terms`, `license change` -> `LICENSING_CHANGE`
- `savings plan`, `commitment`, `reserved instance` -> `COMMITMENT_CHANGE`
- `discount`, `rebate` -> `DISCOUNT_CHANGE`
- `sku`, `edition`, `plan` -> `SKU_CHANGE`
- `policy`, `terms of service` -> `POLICY_CHANGE`
- `feature`, `guidance`, `optimization` -> `FEATURE_CHANGE`

## Opportunity Factory integration

The VCDE flow is now:

`VendorSignal -> VendorChangeEvent -> ImpactAssessment -> VendorProvider -> OpportunityFactory -> OpportunityRepository -> Executive Priorities`.

No recommendations are created directly. Promotion calls the existing Opportunity Factory, and generated canonical opportunities use `source = VENDOR_CHANGE`, `sourceReferenceId = vendorChangeId`, evidence including source signal/source URL/classification reasons, and readiness derived from impact confidence.

## Remaining limitations

- Signal and change storage remains in-memory/static-seeded in this environment.
- Manual/test ingestion is supported; real RSS/web/API fetching is intentionally not implemented in this sprint.
- Tenant inventory matching uses deterministic seeded/demo profiles where live inventory services are not available.
- Impact confidence is intentionally LOW with reason `tenant inventory unavailable` when no footprint/spend exists.

## Production risks

- Real external feeds need connector ownership, retry/backoff, content extraction, and source authentication controls.
- Hash dedupe is deterministic but simple; production should add canonical URL normalization and publisher-specific IDs.
- Classification is explainable but keyword based; false positives/negatives should be reviewed before automated promotion.
- Durable signal/change persistence is required before production use.

## Next required work for real web/RSS/API connectors

1. Add managed source registry for vendor announcement feeds.
2. Add fetch workers with rate limits, robots/source-policy checks, and retry semantics.
3. Add durable `vendor_signals` and extended `vendor_changes` persistence.
4. Add source trust scoring and publisher signature/evidence capture.
5. Add operator review queue for classifier low-confidence signals.
