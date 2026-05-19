export const evaluateForecastAssumptionDrift=(i:{assumptionDelta:number})=>({drift:i.assumptionDelta,confidenceImpact:Math.min(1,Math.Math.max(0,i.assumptionDelta))});
