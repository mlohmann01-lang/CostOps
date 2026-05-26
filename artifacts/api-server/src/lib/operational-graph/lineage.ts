import { randomUUID } from "node:crypto";
import type { GraphLineage } from "./types";

export const buildLineage = (runId?: string, parents: string[] = []): GraphLineage => ({
  lineageId: randomUUID(),
  runId,
  parents,
  capturedAt: new Date().toISOString(),
});
