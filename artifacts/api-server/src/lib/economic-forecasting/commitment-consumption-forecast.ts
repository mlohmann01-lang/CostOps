import type { ForecastInput } from "./economic-forecasting-types"; export const forecastCommitmentConsumption=(i:ForecastInput)=>({consumption:i.base*(1+i.growthRate),assumptions:i.assumptions});
