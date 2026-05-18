import type { AIUsageRecord } from "./ai-usage-normalization";

export interface AIOutcomeAttribution {
  ai_cost_delta: number;
  ai_productivity_delta: number;
  ai_time_saved: number;
  ai_contract_reduction: number;
  ai_tool_consolidation: number;
  ai_inference_efficiency: number;
  ai_model_efficiency: number;
  ai_prompt_efficiency: number;
  ai_agent_efficiency: number;
  ai_budget_drift_prevented: number;
  ai_spend_avoided: number;
}

export function deriveOutcomeAttribution(records: AIUsageRecord[]): AIOutcomeAttribution {
  const productivity = records.reduce((sum, record) => sum + record.productivitySignal, 0);
  const spend = records.reduce((sum, record) => sum + record.estimatedCost, 0);

  return {
    ai_cost_delta: spend,
    ai_productivity_delta: productivity,
    ai_time_saved: productivity * 0.5,
    ai_contract_reduction: 0,
    ai_tool_consolidation: 0,
    ai_inference_efficiency: 0,
    ai_model_efficiency: 0,
    ai_prompt_efficiency: 0,
    ai_agent_efficiency: 0,
    ai_budget_drift_prevented: 0,
    ai_spend_avoided: 0,
  };
}
