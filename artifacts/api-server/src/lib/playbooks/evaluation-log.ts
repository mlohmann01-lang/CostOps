import { db, playbookEvaluationEventsTable } from "@workspace/db";

export async function createPlaybookEvaluationEvent(input: any) {
  const [event] = await db
    .insert(playbookEvaluationEventsTable)
    .values({
      tenantId: input.tenantId,
      ingestionRunId: input.ingestionRunId,
      playbookId: input.playbookId,
      playbookName: input.playbookName,
      candidateType: input.candidateType,
      candidateId: input.candidateId,
      candidateDisplayName: input.candidateDisplayName ?? "",
      matched: String(Boolean(input.matched)),
      reason: input.reason ?? "",
      recommendedAction: input.recommendedAction ?? "",
      exclusions: input.exclusions ?? [],
      requiredSignals: input.requiredSignals ?? [],
      missingSignals: input.missingSignals ?? [],
      evidence: input.evidence ?? {},
    })
    .returning();

  return event;
}
