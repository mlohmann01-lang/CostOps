import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { outcomeLedgerTable } from "@workspace/db";

export function buildIdempotencyKey(recommendationId: string, action: string): string {
  return `recommendation:${recommendationId}:action:${action}`;
}

export async function checkExistingExecution(recommendationId: string, action: string) {
  const idempotencyKey = buildIdempotencyKey(recommendationId, action);
  const [existing] = await db
    .select()
    .from(outcomeLedgerTable)
    .where(and(eq(outcomeLedgerTable.idempotencyKey, idempotencyKey), eq(outcomeLedgerTable.recommendationId, recommendationId), eq(outcomeLedgerTable.action, action)));

  return { idempotencyKey, existing };
}

export async function assertNotAlreadyExecuted(recommendationId: string, action: string) {
  const { idempotencyKey, existing } = await checkExistingExecution(recommendationId, action);
  return {
    allowed: !existing,
    duplicateExecution: Boolean(existing),
    idempotencyKey,
    existing,
  };
}
