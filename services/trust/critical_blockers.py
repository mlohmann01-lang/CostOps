from services.trust.trust_constants import CRITICAL_BLOCKERS


def detect_critical_blockers(context: dict) -> list[str]:
    blockers: list[str] = []

    if context.get("identity_conflict"):
        blockers.append("IDENTITY_CONFLICT")
    if context.get("entitlement_conflict"):
        blockers.append("ENTITLEMENT_CONFLICT")
    if context.get("source_stale_beyond_sla"):
        blockers.append("SOURCE_STALE_BEYOND_SLA")
    if context.get("connector_health_failed"):
        blockers.append("CONNECTOR_HEALTH_FAILED")
    if context.get("owner_unknown_for_chargeable_action"):
        blockers.append("OWNER_UNKNOWN_FOR_CHARGEABLE_ACTION")
    if context.get("policy_violation"):
        blockers.append("POLICY_VIOLATION")
    if context.get("high_risk_action_without_approval"):
        blockers.append("HIGH_RISK_ACTION_WITHOUT_APPROVAL")
    if context.get("rollback_unavailable_for_disruptive_action"):
        blockers.append("ROLLBACK_UNAVAILABLE_FOR_DISRUPTIVE_ACTION")
    if context.get("usage_data_missing_for_removal_action"):
        blockers.append("USAGE_DATA_MISSING_FOR_REMOVAL_ACTION")
    if context.get("admin_or_service_account_match"):
        blockers.append("ADMIN_OR_SERVICE_ACCOUNT_MATCH")

    return [blocker for blocker in blockers if blocker in CRITICAL_BLOCKERS]
