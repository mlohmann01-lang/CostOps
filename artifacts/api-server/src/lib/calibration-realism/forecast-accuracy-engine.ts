export const evaluateForecastAccuracy=(errs:number[])=>errs.length===0?0.5:Math.max(0,Math.min(1,1-(errs.reduce((a,b)=>a+Math.abs(b),0)/(errs.length*100))));
