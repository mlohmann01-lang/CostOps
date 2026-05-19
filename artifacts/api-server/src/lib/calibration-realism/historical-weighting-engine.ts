export const evaluateHistoricalWeighting=(history:number[])=>history.length===0?0.5:Math.max(0,Math.min(1,history.reduce((a,b)=>a+b,0)/history.length));
