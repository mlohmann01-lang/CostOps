from services.trust.recommendation_trust import calculate_recommendation_trust
from services.trust.trust_models import RecommendationTrustInput


def test_recommendation_trust_weighted_calculation():
    score = calculate_recommendation_trust(
        RecommendationTrustInput(
            usage_signal_quality=0.85,
            entitlement_confidence=1.0,
            policy_fit=0.75,
            savings_confidence=0.8,
        ),
        entity_trust_score=0.9125,
    )
    assert score == 0.8869
