import { normalizeEconomicCausalSignals } from './economic-causal-signal-normalizer';
import type { EconomicCausalSignal } from './economic-causality-types';
export const evaluateEconomicDriftCause=(input:EconomicCausalSignal[])=>normalizeEconomicCausalSignals(input)[0];
