export function connectorPerformance(latencies:number[]){ if(!latencies.length) return 0; return Number((latencies.reduce((a,b)=>a+b,0)/latencies.length).toFixed(2)); }
