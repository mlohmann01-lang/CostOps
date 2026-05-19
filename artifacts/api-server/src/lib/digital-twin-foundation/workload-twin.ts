import type { TwinInput } from "./digital-twin-types"; export const buildWorkloadTwin=(input:TwinInput)=>({id:input.id,workload:input.workload??0,eagLink:"FORECASTS",deterministicForecast:true});
