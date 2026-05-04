"""Constants for Trust Score System V2."""

ENTITY_TRUST_WEIGHTS = {
    "identity_confidence": 0.30,
    "source_consistency": 0.25,
    "data_freshness": 0.20,
    "ownership_confidence": 0.15,
    "source_reliability": 0.10,
}

RECOMMENDATION_TRUST_WEIGHTS = {
    "entity_trust": 0.35,
    "usage_signal_quality": 0.25,
    "entitlement_confidence": 0.20,
    "policy_fit": 0.10,
    "savings_confidence": 0.10,
}

EXECUTION_READINESS_WEIGHTS = {
    "recommendation_trust": 0.35,
    "action_reversibility": 0.20,
    "approval_state": 0.20,
    "blast_radius_score": 0.15,
    "rollback_confidence": 0.10,
}

GATE_THRESHOLDS = {
    "auto_execute_eligible": 0.90,
    "approval_required": 0.75,
    "investigate": 0.50,
}

GATE_BLOCKED = "BLOCKED"
GATE_AUTO_EXECUTE_ELIGIBLE = "AUTO_EXECUTE_ELIGIBLE"
GATE_APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
GATE_INVESTIGATE = "INVESTIGATE"

CRITICAL_BLOCKERS = {
    "IDENTITY_CONFLICT",
    "ENTITLEMENT_CONFLICT",
    "SOURCE_STALE_BEYOND_SLA",
    "CONNECTOR_HEALTH_FAILED",
    "OWNER_UNKNOWN_FOR_CHARGEABLE_ACTION",
    "POLICY_VIOLATION",
    "HIGH_RISK_ACTION_WITHOUT_APPROVAL",
    "ROLLBACK_UNAVAILABLE_FOR_DISRUPTIVE_ACTION",
    "USAGE_DATA_MISSING_FOR_REMOVAL_ACTION",
    "ADMIN_OR_SERVICE_ACCOUNT_MATCH",
}
