# Operational Telemetry

Operational telemetry is append-only and replay-safe.

This layer persists tenant-scoped operational events, connector health snapshots, governance activity stream records, and operator activity events. It also exposes deterministic SLA status and runtime diagnostics.

Failure taxonomy categories:
CONNECTOR_FAILURE, TRUST_DEGRADATION, RECONCILIATION_FAILURE, GOVERNANCE_BLOCK, SIMULATION_FAILURE, OUTCOME_VALIDATION_FAILURE, GRAPH_INTEGRITY_FAILURE, POLICY_EVALUATION_FAILURE, RATE_LIMIT_EXCEEDED, AUTHORIZATION_FAILURE, DATA_STALENESS.
