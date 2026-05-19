import type { ForecastInput } from "./economic-forecasting-types"; export const forecastCloudCost=(i:ForecastInput)=>({cost:i.base*(1+i.growthRate),assumptions:i.assumptions});
