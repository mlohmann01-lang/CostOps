export const evaluateVolatilityStabilization=(hist:number[])=>hist.length===0?0.5:Math.max(0,Math.min(1,1-(hist.reduce((a,b)=>a+b,0)/hist.length)));
