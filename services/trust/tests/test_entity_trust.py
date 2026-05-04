from services.trust.entity_trust import calculate_entity_trust
from services.trust.trust_models import EntityTrustInput


def test_entity_trust_weighted_calculation():
    score = calculate_entity_trust(
        EntityTrustInput(
            identity_confidence=1.0,
            source_consistency=0.8,
            data_freshness=1.0,
            ownership_confidence=0.75,
            source_reliability=1.0,
        )
    )
    assert score == 0.9125
