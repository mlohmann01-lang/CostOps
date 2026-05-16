# Recommendation Outcomes

Checkpoint 25 introduces deterministic, append-only recommendation outcome intelligence.

## Deterministic outcome resolution

Outcomes are resolved by `RecommendationOutcomeResolutionService` using only persisted recommendation state, connector snapshots, and outcome ledger evidence.

## Realization rules

Statuses: `PENDING`, `REALIZED`, `PARTIALLY_REALIZED`, `FAILED`, `DRIFTED`, `REVERSED`, `UNVERIFIED`.

## Drift detection model

`RecommendationOutcomeDriftService` re-runs deterministic resolution and appends new immutable snapshots when drift/reversal evidence appears.

## Append-only history

Historical outcomes are never overwritten; each new status is persisted as a new `recommendation_outcomes` row.

## Confidence calibration

Calibration labels are deterministic and based on realized-vs-projected delta bands.

## Realized-vs-projected methodology

`realization_delta = realized_monthly_savings - projected_monthly_savings`.

## Realized intelligence UI (Checkpoint 26)

The control-plane UI exposes outcome proof, realized-vs-projected panels, confidence calibration, drift/reversal visibility, and an executive proof summary.

No remediation controls are provided in outcome intelligence UI.
