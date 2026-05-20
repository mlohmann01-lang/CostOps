import { classifyWorkloadVolatility } from "./workload-volatility-classifier"; export const computeWorkloadVolatilityReport=(i:{score:number})=>({class:classifyWorkloadVolatility(i.score)});
