export const evaluateReplayDrift=(i:{misses:number[]})=>({recurringDrift:i.misses.filter((m)=>Math.abs(m)>0.2).length/i.misses.length});
