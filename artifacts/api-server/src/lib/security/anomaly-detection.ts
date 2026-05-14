export function detectAnomaly(values: number[]){ if(!values.length) return false; const avg=values.reduce((a,b)=>a+b,0)/values.length; return values.some((v)=>v>avg*2); }
