export const computeSavingsHalfLife=(i:{months:number;decay:number})=>({halfLifeMonths:Math.max(1, i.months*(1-i.decay))});
