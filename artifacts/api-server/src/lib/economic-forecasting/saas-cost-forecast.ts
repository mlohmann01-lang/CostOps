import type { ForecastInput } from "./economic-forecasting-types"; export const forecastSaaSCost=(i:ForecastInput)=>({cost:i.base*(1+i.growthRate*0.8),assumptions:i.assumptions});
