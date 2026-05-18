# Copilot Underutilisation Review

## Objective
TBD

## Candidate Action
TBD

## Detection Signals
- TBD

## Required Evidence
- assigned SKUs
- activity and sign-in recency
- tenant identifiers and freshness timestamps

## Sensitivity / Escalation
- enforce elevated handling for privileged/admin/VIP/service/ambiguous ownership entities
- recommendation mode must be `APPROVAL_REQUIRED` for sensitive cases

## Recommendation Contract
- emit canonical `RecommendationCandidate`
- include trust snapshot, risk classification, approval requirement, savings estimate, operational context, and idempotency key

## Conflict and Arbitration Notes
- route through Decision Intelligence conflict detection, sensitivity evaluation, confidence engine, arbitration, and ranking

## Replay and Outcome Ledger
- append-only lineage, replay-safe determinism, and tenant isolation required
