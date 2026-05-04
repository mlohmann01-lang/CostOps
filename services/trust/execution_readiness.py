from services.trust.trust_constants import EXECUTION_READINESS_WEIGHTS
from services.trust.trust_models import ExecutionReadinessInput


def _bounded(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def calculate_execution_readiness(
    execution_input: ExecutionReadinessInput, recommendation_trust_score: float
) -> float:
    score = (
        _bounded(recommendation_trust_score)
        * EXECUTION_READINESS_WEIGHTS["recommendation_trust"]
        + _bounded(execution_input.action_reversibility)
        * EXECUTION_READINESS_WEIGHTS["action_reversibility"]
        + _bounded(execution_input.approval_state) * EXECUTION_READINESS_WEIGHTS["approval_state"]
        + _bounded(execution_input.blast_radius_score)
        * EXECUTION_READINESS_WEIGHTS["blast_radius_score"]
        + _bounded(execution_input.rollback_confidence)
        * EXECUTION_READINESS_WEIGHTS["rollback_confidence"]
    )
    return round(_bounded(score), 4)
