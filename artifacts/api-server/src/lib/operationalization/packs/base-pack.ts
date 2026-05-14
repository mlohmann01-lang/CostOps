export type PackType = "SERVICENOW_SAM_ACCELERATION" | "FLEXERA_VALUE_REALIZATION";

export type PackEvaluationResult = {
  readinessScore: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "READY_FOR_GOVERNANCE" | "COMPLETED";
  blockers: string[];
  nextActions: string[];
  topPriorityApps: Array<{ appKey: string; score: number }>;
  evidence: Record<string, unknown>;
};

export interface OperationalizationPack {
  packType: PackType;
  evaluate(apps: any[]): PackEvaluationResult;
  summarize(result: PackEvaluationResult): Record<string, unknown>;
  generateNextActions(result: PackEvaluationResult): string[];
  emitEvents(result: PackEvaluationResult): Array<{ eventType: string; severity: "INFO" | "WARNING" | "HIGH"; appKey?: string; message: string; evidence?: Record<string, unknown> }>;
}
