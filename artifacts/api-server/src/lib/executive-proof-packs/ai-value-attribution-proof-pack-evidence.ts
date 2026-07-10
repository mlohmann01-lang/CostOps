import type { AIActivityLineage } from '../ai-value-attribution/ai-value-attribution-types';

export interface AIValueSummaryEntry {
  activityId: string;
  activityName: string;
  activityType: string;
  attributedValue: number;
  confidence: number;
  evidenceCount: number;
  linkedWorkflowIds: string[];
  linkedOutcomeIds: string[];
  verdict: string;
}

/** Workstream 11: "AI Value Summary" section reusing AI activities, attributed value, confidence, evidence count — no new proof pack type. */
export function buildAIValueSummaryMetrics(lineages: AIActivityLineage[]): {
  aiValueSummary: { activityCount: number; totalAttributedValue: number; topActivities: AIValueSummaryEntry[] };
} {
  const entries: AIValueSummaryEntry[] = lineages.map((lineage) => ({
    activityId: lineage.activity.id,
    activityName: lineage.activity.activityName,
    activityType: lineage.activity.activityType,
    attributedValue: lineage.evaluation.totalAttributedValue,
    confidence: lineage.evaluation.confidence,
    evidenceCount: lineage.attributions.filter((a) => a.evidenceItemId).length,
    linkedWorkflowIds: lineage.workflows.map((w) => w.workflowId),
    linkedOutcomeIds: lineage.outcomes.map((o) => o.outcomeId),
    verdict: lineage.evaluation.verdict,
  }));
  const topActivities = [...entries].sort((a, b) => b.attributedValue - a.attributedValue).slice(0, 5);
  return {
    aiValueSummary: {
      activityCount: lineages.length,
      totalAttributedValue: entries.reduce((sum, e) => sum + e.attributedValue, 0),
      topActivities,
    },
  };
}

export function buildAIValueAttributionProofPackEvidence(lineages: AIActivityLineage[]) {
  return lineages.flatMap((lineage) => lineage.attributions.filter((a) => a.evidenceItemId).map((a) => ({
    evidenceRef: a.evidenceItemId as string,
    targetId: lineage.activity.id,
    trustLevel: (a.attributionConfidence ?? 0) >= 0.8 ? 'HIGH' as const : 'MEDIUM' as const,
    integrityStatus: 'PASS' as const,
    redactionStatus: 'NOT_REQUIRED' as const,
  })));
}
