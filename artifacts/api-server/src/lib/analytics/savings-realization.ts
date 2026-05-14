export function savingsRealization(projected:number, verified:number){ return { projected, verified, realizationPct: projected?Number(((verified/projected)*100).toFixed(1)):0 }; }
