import { computeForecastConfidenceBounds } from "./forecast-confidence-bounds";
export const computeConfidenceBoundsReport=(i:any)=>({forecast:computeForecastConfidenceBounds(i.forecast),savings:computeForecastConfidenceBounds(i.savings),execution:computeForecastConfidenceBounds(i.execution),attribution:computeForecastConfidenceBounds(i.attribution)});
