import { normalizeEconomicEvidence } from './economic-evidence-model';
import type { EconomicForecastContract } from './economic-kernel-types';
export function normalizeEconomicForecastContract(input:EconomicForecastContract):EconomicForecastContract{return {...input,confidence:Math.max(0,Math.min(1,input.confidence)),stability:Math.max(0,Math.min(1,input.stability)),evidenceReferences:normalizeEconomicEvidence(input.evidenceReferences)};}
