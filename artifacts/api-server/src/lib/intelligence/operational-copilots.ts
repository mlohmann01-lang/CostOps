export type CopilotType = 'onboarding'|'governance'|'operationalization'|'connector_operations';

export interface CopilotInsight { copilot: CopilotType; summary: string; rationale: string; evidenceLinks: string[]; actionability: 'suggestion_only' }

export function createCopilotInsight(copilot: CopilotType, summary: string, rationale: string, evidenceLinks: string[]): CopilotInsight {
  return { copilot, summary, rationale, evidenceLinks, actionability: 'suggestion_only' };
}
