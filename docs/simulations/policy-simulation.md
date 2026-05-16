# Policy Simulation (Non-Authoritative)

Policy Simulation provides deterministic pre-execution forecasting and never executes, approves, mutates external systems, or bypasses governance/runtime controls.

## Deterministic Simulation Model
Inputs are strictly persisted platform evidence:
- recommendations
- trust snapshots
- reconciliation findings
- governance policy posture
- connector evidence quality
- historical realized/drift/reversal intelligence

## Blast Radius Methodology
Blast radius combines deterministic factors:
- affected users/licenses/groups
- governance sensitivity
- trust quality
- historical drift/reversal rates

Score bands:
- 0–20 LOW
- 21–50 MODERATE
- 51–80 HIGH
- 81–100 CRITICAL

## Governance Forecasting
Governance risk score includes:
- unresolved blockers
- low/quarantined trust exposure
- privileged entity impact
- policy exceptions
- stale evidence

## Historical Intelligence Forecasting
Forecast confidence and drift/reversal predictions are adjusted using:
- historical realization rates
- historical drift rates
- historical reversal rates
- projected-vs-realized deltas
- confidence calibration rate

## Immutable Persistence + Integrity
Every simulation run persists as a new immutable snapshot in `policy_simulations`.
A deterministic hash is generated from canonical snapshot content and can be validated via integrity APIs.
