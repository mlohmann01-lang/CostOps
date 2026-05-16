export type PlaybookSubject = {
  type: "USER" | "LICENCE" | "APP" | "ASSET";
  id: string;
  displayName?: string;
  email?: string;
};

export type PlaybookEvaluationResult = {
  matched: boolean;
  reason: string;
  recommendedAction: string | string[];
  estimatedMonthlySaving: number;
  subject: PlaybookSubject;
  evidence: Record<string, unknown>;
  exclusions: string[];
  requiredSignals: string[];
  verificationMethod?: string;
  executionMode?: "AUTOMATED" | "APPROVAL_REQUIRED" | "MANUAL";
  riskClass?: "A" | "B" | "C";
  rollbackNotes?: string;
  trustRequirements?: string[];
};

export type BasePlaybook<TInput = unknown> = {
  id: string;
  name: string;
  vendor: string;
  action: string;
  riskClass: "A" | "B" | "C";
  description: string;
  triggerConditions: string[];
  requiredEvidence: string[];
  exclusionRules: string[];
  recommendedAction: string | string[];
  defaultExecutionMode: "AUTOMATED" | "APPROVAL_REQUIRED" | "MANUAL";
  expectedSavingsModel: string;
  verificationMethod: string;
  rollbackConsiderations: string;
  evaluate: (input: TInput) => PlaybookEvaluationResult;
};
