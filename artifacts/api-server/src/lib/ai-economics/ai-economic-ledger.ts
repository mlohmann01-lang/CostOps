import type { AIOutcomeAttribution } from "./ai-outcome-attribution";

export interface AIEconomicEvent {
  projectedCost: number;
  realizedCost: number;
  projectedOutcome: number;
  realizedOutcome: number;
  confidence: number;
  governanceState: string;
  replayCorrelationId: string;
  lineageCorrelationId: string;
}

export interface AIEconomicLedgerEntry extends AIEconomicEvent {
  attribution: AIOutcomeAttribution;
  recordedAt: string;
}

export function recordAIEconomicEvent(event: AIEconomicEvent, attribution: AIOutcomeAttribution): AIEconomicLedgerEntry {
  return {
    ...event,
    attribution,
    recordedAt: new Date().toISOString(),
  };
}
