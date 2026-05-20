import { evaluateExecutionOutcomeVerification } from "./execution-outcome-verification";
export const computeExecutionReplayReport=(i:{expected:number;actual:number})=>({verification:evaluateExecutionOutcomeVerification(i)});
