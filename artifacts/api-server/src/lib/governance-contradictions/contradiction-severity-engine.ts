export const computeContradictionSeverity=(c:string[])=>({severity:Math.min(1,Number((c.length*0.25).toFixed(4))),forceBlocked:c.length>=3});
