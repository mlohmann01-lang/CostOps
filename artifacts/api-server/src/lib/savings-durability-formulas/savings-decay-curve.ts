export const computeSavingsDecayCurve=(i:{baseSavings:number;months:number;decay:number})=>Array.from({length:i.months},(_,m)=>i.baseSavings*Math.pow(1-i.decay,m));
