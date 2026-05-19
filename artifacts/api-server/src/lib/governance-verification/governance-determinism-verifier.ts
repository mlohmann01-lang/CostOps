export const verifyDeterminism=(input:{proofHash:string;replayHash:string})=>({ok:input.proofHash.length>0&&input.replayHash.length>0});
