import { computePartialRealization } from "./partial-realization-formula";
export const computeExecutionRealizationReport=(i:any)=>({realization:computePartialRealization(i.partial)});
