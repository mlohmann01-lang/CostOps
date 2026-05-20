export const evaluatePostflight=(expected:string, actual:string)=>({ok:expected===actual,mismatch:expected===actual?undefined:`expected:${expected},actual:${actual}`});
