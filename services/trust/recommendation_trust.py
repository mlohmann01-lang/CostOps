from services.trust.trust_constants import RECOMMENDATION_TRUST_WEIGHTS
from services.trust.trust_models import RecommendationTrustInput


def _bounded(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def calculate_recommendation_trust(
    recommendation_input: RecommendationTrustInput, entity_trust_score: float
) -> float:
    score = (
        _bounded(entity_trust_score) * RECOMMENDATION_TRUST_WEIGHTS["entity_trust"]
        + _bounded(recommendation_input.usage_signal_quality)
        * RECOMMENDATION_TRUST_WEIGHTS["usage_signal_quality"]
        + _bounded(recommendation_input.entitlement_confidence)
        * RECOMMENDATION_TRUST_WEIGHTS["entitlement_confidence"]
        + _bounded(recommendation_input.policy_fit) * RECOMMENDATION_TRUST_WEIGHTS["policy_fit"]
        + _bounded(recommendation_input.savings_confidence)
        * RECOMMENDATION_TRUST_WEIGHTS["savings_confidence"]
    )
    return round(_bounded(score), 4)
