from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class EntityTrustInput:
    identity_confidence: float
    source_consistency: float
    data_freshness: float
    ownership_confidence: float
    source_reliability: float


@dataclass
class RecommendationTrustInput:
    usage_signal_quality: float
    entitlement_confidence: float
    policy_fit: float
    savings_confidence: float


@dataclass
class ExecutionReadinessInput:
    action_reversibility: float
    approval_state: float
    blast_radius_score: float
    rollback_confidence: float


@dataclass
class TrustAssessmentResult:
    entity_trust_score: float
    recommendation_trust_score: float
    execution_readiness_score: float
    execution_gate: str
    critical_blockers: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    score_breakdown: Dict[str, float] = field(default_factory=dict)
