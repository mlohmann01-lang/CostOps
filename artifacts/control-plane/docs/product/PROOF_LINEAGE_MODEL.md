# Proof Lineage Model

Certen proof lineage is deterministic and causal:
Evidence Source → Normalized Signal → Recommendation → Readiness Gate → Approval → Execution → Verification → Drift Monitor (+ Authority Evidence, Rollback).

Each node includes: source, confidence, timestamp, synthetic/live label, estimate flag, authority type, and status.

This model is used by RecommendationDetailDrawer to explain why a recommendation is trusted, blocked, or pending verification.
