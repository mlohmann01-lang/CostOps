from services.trust.execution_readiness import calculate_execution_readiness
from services.trust.trust_models import ExecutionReadinessInput


def test_execution_readiness_weighted_calculation():
    score = calculate_execution_readiness(
        ExecutionReadinessInput(
            action_reversibility=0.75,
            approval_state=0.4,
            blast_radius_score=1.0,
            rollback_confidence=0.75,
        ),
        recommendation_trust_score=0.8869,
    )
    assert score == 0.7654
