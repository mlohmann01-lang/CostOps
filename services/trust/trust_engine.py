from services.trust.critical_blockers import detect_critical_blockers
from services.trust.entity_trust import calculate_entity_trust
from services.trust.execution_readiness import calculate_execution_readiness
from services.trust.recommendation_trust import calculate_recommendation_trust
from services.trust.trust_constants import (
    GATE_APPROVAL_REQUIRED,
    GATE_AUTO_EXECUTE_ELIGIBLE,
    GATE_BLOCKED,
    GATE_INVESTIGATE,
    GATE_THRESHOLDS,
)
from services.trust.trust_models import (
    EntityTrustInput,
    ExecutionReadinessInput,
    RecommendationTrustInput,
    TrustAssessmentResult,
)


def _assign_gate(execution_readiness_score: float, has_blockers: bool, mvp_mode: bool) -> str:
    if has_blockers:
        return GATE_BLOCKED

    if execution_readiness_score >= GATE_THRESHOLDS["auto_execute_eligible"]:
        return GATE_APPROVAL_REQUIRED if mvp_mode else GATE_AUTO_EXECUTE_ELIGIBLE
    if execution_readiness_score >= GATE_THRESHOLDS["approval_required"]:
        return GATE_APPROVAL_REQUIRED
    if execution_readiness_score >= GATE_THRESHOLDS["investigate"]:
        return GATE_INVESTIGATE
    return GATE_BLOCKED


def assess_trust(context: dict) -> TrustAssessmentResult:
    entity_input = EntityTrustInput(**context["entity_input"])
    recommendation_input = RecommendationTrustInput(**context["recommendation_input"])
    execution_input = ExecutionReadinessInput(**context["execution_input"])

    entity_score = calculate_entity_trust(entity_input)
    recommendation_score = calculate_recommendation_trust(recommendation_input, entity_score)
    execution_score = calculate_execution_readiness(execution_input, recommendation_score)

    blockers = detect_critical_blockers(context.get("blocker_context", {}))
    warnings = list(context.get("warnings", []))

    if recommendation_input.savings_confidence < 1.0:
        warnings.append("Savings confidence is below contract-grade certainty")

    gate = _assign_gate(
        execution_readiness_score=execution_score,
        has_blockers=bool(blockers),
        mvp_mode=context.get("mvp_mode", True),
    )

    score_breakdown = {
        **context["entity_input"],
        "entity_trust": entity_score,
        **context["recommendation_input"],
        "recommendation_trust": recommendation_score,
        **context["execution_input"],
    }

    return TrustAssessmentResult(
        entity_trust_score=entity_score,
        recommendation_trust_score=recommendation_score,
        execution_readiness_score=execution_score,
        execution_gate=gate,
        critical_blockers=blockers,
        warnings=warnings,
        score_breakdown=score_breakdown,
    )
