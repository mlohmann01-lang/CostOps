export const evaluateExecutiveMateriality=(impact:number,severity:number)=>Math.max(0,Math.min(1,(impact*0.6)+(severity*0.4)));
