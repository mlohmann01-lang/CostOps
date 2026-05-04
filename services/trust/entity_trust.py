from services.trust.trust_constants import ENTITY_TRUST_WEIGHTS
from services.trust.trust_models import EntityTrustInput


def _bounded(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def calculate_entity_trust(entity_input: EntityTrustInput) -> float:
    score = (
        _bounded(entity_input.identity_confidence) * ENTITY_TRUST_WEIGHTS["identity_confidence"]
        + _bounded(entity_input.source_consistency) * ENTITY_TRUST_WEIGHTS["source_consistency"]
        + _bounded(entity_input.data_freshness) * ENTITY_TRUST_WEIGHTS["data_freshness"]
        + _bounded(entity_input.ownership_confidence) * ENTITY_TRUST_WEIGHTS["ownership_confidence"]
        + _bounded(entity_input.source_reliability) * ENTITY_TRUST_WEIGHTS["source_reliability"]
    )
    return round(_bounded(score), 4)
