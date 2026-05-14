export type AutomationMode = 'SIMULATION_ONLY' | 'APPROVAL_REQUIRED' | 'SAFE_AUTO_EXECUTE' | 'BLOCKED';

export interface AutomationCandidate { id: string; riskClass: 'A'|'B'|'C'; action: string; blastRadius: number }

export function evaluateAutomationMode(candidate: AutomationCandidate): AutomationMode {
  if (candidate.riskClass !== 'A') return 'APPROVAL_REQUIRED';
  if (candidate.blastRadius > 10) return 'SIMULATION_ONLY';
  return 'SAFE_AUTO_EXECUTE';
}
