from services.trust.critical_blockers import detect_critical_blockers
from services.trust.trust_engine import assess_trust


def _base_context():
    return {
        "entity_input": {
            "identity_confidence": 1.0,
            "source_consistency": 1.0,
            "data_freshness": 1.0,
            "ownership_confidence": 1.0,
            "source_reliability": 1.0,
        },
        "recommendation_input": {
            "usage_signal_quality": 1.0,
            "entitlement_confidence": 1.0,
            "policy_fit": 1.0,
            "savings_confidence": 1.0,
        },
        "execution_input": {
            "action_reversibility": 1.0,
            "approval_state": 1.0,
            "blast_radius_score": 1.0,
            "rollback_confidence": 1.0,
        },
        "blocker_context": {},
        "mvp_mode": True,
    }


def test_detect_specific_blockers():
    blockers = detect_critical_blockers(
        {
            "admin_or_service_account_match": True,
            "usage_data_missing_for_removal_action": True,
        }
    )
    assert "ADMIN_OR_SERVICE_ACCOUNT_MATCH" in blockers
    assert "USAGE_DATA_MISSING_FOR_REMOVAL_ACTION" in blockers


def test_critical_blockers_override_high_scores():
    ctx = _base_context()
    ctx["blocker_context"] = {"entitlement_conflict": True}
    result = assess_trust(ctx)
    assert result.execution_gate == "BLOCKED"


def test_mvp_downgrades_auto_execute_to_approval_required():
    result = assess_trust(_base_context())
    assert result.execution_gate == "APPROVAL_REQUIRED"


def test_threshold_bands_without_mvp_downgrade():
    base = _base_context()
    base["mvp_mode"] = False
    assert assess_trust(base).execution_gate == "AUTO_EXECUTE_ELIGIBLE"

    approval = _base_context()
    approval["mvp_mode"] = False
    approval["execution_input"]["approval_state"] = 0.4
    assert assess_trust(approval).execution_gate == "APPROVAL_REQUIRED"

    investigate = _base_context()
    investigate["mvp_mode"] = False
    investigate["execution_input"].update(
        {
            "action_reversibility": 0.5,
            "approval_state": 0.0,
            "blast_radius_score": 0.6,
            "rollback_confidence": 0.5,
        }
    )
    assert assess_trust(investigate).execution_gate == "INVESTIGATE"

    blocked = _base_context()
    blocked["mvp_mode"] = False
    blocked["recommendation_input"]["usage_signal_quality"] = 0.0
    blocked["execution_input"].update(
        {
            "action_reversibility": 0.2,
            "approval_state": 0.0,
            "blast_radius_score": 0.0,
            "rollback_confidence": 0.2,
        }
    )
    assert assess_trust(blocked).execution_gate == "BLOCKED"


def test_missing_usage_data_blocks_license_removal():
    ctx = _base_context()
    ctx["blocker_context"] = {"usage_data_missing_for_removal_action": True}
    result = assess_trust(ctx)
    assert result.execution_gate == "BLOCKED"


def test_admin_service_account_is_blocked():
    ctx = _base_context()
    ctx["blocker_context"] = {"admin_or_service_account_match": True}
    result = assess_trust(ctx)
    assert result.execution_gate == "BLOCKED"
