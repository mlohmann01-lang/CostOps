import type { AIDomainCandidate } from "./ai-decision-intelligence-integration";
import type { AISensitivityResult } from "./ai-sensitivity-rules";

export interface AIMemoryContext { reversalRate?: number; falsePositiveRate?: number; }
export interface AIConfidenceResult { score: number; confidenceBand: "LOW"|"MODERATE"|"HIGH"; penalties: string[]; }

export function calculateAIRecommendationConfidence(candidate: AIDomainCandidate, sensitivity: AISensitivityResult, memory: AIMemoryContext = {}): AIConfidenceResult {
  let score = 0.8; const penalties: string[] = [];
  if (!candidate.operationalContext.ownerDefined) { score -= 0.15; penalties.push("MISSING_OWNER"); }
  if (Number(candidate.aiMetadata.aiProductivitySignal ?? 0) < 0.2) { score -= 0.1; penalties.push("WEAK_PRODUCTIVITY_SIGNAL"); }
  if (sensitivity.sensitivityClass === "CRITICAL") { score -= 0.15; penalties.push("CRITICAL_SENSITIVITY"); }
  if ((memory.reversalRate ?? 0) > 0.3) { score -= 0.1; penalties.push("HIGH_REVERSAL_RISK"); }
  if ((memory.falsePositiveRate ?? 0) > 0.2) { score -= 0.1; penalties.push("FALSE_POSITIVE_HISTORY"); }
  score = Math.max(0, Math.min(1, score));
  return { score, confidenceBand: score >= 0.75 ? "HIGH" : score >= 0.5 ? "MODERATE" : "LOW", penalties };
}
