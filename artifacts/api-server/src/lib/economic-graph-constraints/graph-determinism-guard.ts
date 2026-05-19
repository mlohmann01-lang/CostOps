export const evaluateGraphDeterminism=(input:{hash:string;replayHash:string})=>({deterministic:input.hash===input.replayHash});
