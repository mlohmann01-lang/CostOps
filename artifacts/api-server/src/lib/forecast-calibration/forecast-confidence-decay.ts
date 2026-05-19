export const evaluateForecastConfidenceDecay=(i:{baseConfidence:number;missCount:number})=>({forecastConfidence:Math.max(0,i.baseConfidence-i.missCount*0.1)});
