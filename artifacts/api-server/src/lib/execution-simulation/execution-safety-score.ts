import { estimateExecutionSideEffects } from "./execution-side-effect-estimator"; export const computeExecutionSafetyScore=(i:any)=>Math.max(0,1-estimateExecutionSideEffects(i));
