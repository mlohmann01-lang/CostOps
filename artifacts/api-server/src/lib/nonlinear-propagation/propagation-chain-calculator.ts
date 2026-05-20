import { computeWorkloadCostCurve } from "./workload-cost-curve";
export const computePropagationChain=(i:{stages:any[]})=>i.stages.map((s)=>computeWorkloadCostCurve(s));
