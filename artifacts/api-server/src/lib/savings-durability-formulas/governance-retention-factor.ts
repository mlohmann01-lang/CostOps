export const computeGovernanceRetentionFactor=(i:{governanceStrength:number})=>({retentionFactor:Math.max(0,Math.min(1,i.governanceStrength))});
