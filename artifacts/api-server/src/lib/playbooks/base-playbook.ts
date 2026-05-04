export type PlaybookSubject = {
  type: "USER" | "LICENCE" | "APP" | "ASSET";
  id: string;
  displayName?: string;
  email?: string;
};

export type PlaybookEvaluationResult = {
  matched: boolean;
  reason: string;
  recommendedAction: string;
  estimatedMonthlySaving: number;
  subject: PlaybookSubject;
  evidence: Record<string, unknown>;
  exclusions: string[];
  requiredSignals: string[];
};

export type BasePlaybook<TInput = unknown> = {
  id: string;
  name: string;
  vendor: string;
  action: string;
  riskClass: "A" | "B" | "C";
  evaluate: (input: TInput) => PlaybookEvaluationResult;
};
