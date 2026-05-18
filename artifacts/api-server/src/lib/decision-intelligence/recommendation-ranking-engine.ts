import type { FinalRecommendationDecision } from "./recommendation-candidate-types";
export const rankFinalRecommendations = (arbitratedRecommendations: FinalRecommendationDecision[]) => arbitratedRecommendations
.map((r) => { const base = r.finalDecision === "BLOCKED" ? 0 : r.finalDecision.startsWith("SUPPRESSED") ? 10 : r.finalDecision === "DEFERRED" ? 30 : 60; const score = Math.max(0, Math.min(100, base + Math.round((r.confidenceScore ?? 0) * 0.4) - (r.sensitivityClass === "CRITICAL" ? 20 : 0))); const priorityBand = r.finalDecision.startsWith("SUPPRESSED") ? "SUPPRESSED" : score >= 85 ? "CRITICAL_REVIEW" : score >= 70 ? "HIGH_VALUE" : score >= 50 ? "STANDARD" : "WATCHLIST";
return { ...r, rankingScore: score, rankingReasons:[`decision:${r.finalDecision}`, `confidence:${r.confidenceScore ?? 0}`], priorityBand }; })
.sort((a,b)=>b.rankingScore-a.rankingScore);
