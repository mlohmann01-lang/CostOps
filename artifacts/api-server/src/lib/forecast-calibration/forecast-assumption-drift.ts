export const evaluateForecastAssumptionDrift=(i:{assumptionDelta:number})=>({drift:i.assumptionDelta,confidenceImpact:Math.min(1,Math.max(0,i.assumptionDelta))});
