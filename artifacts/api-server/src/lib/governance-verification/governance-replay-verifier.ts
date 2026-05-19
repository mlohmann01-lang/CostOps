export const verifyReplayDeterminism=(input:{replayHash:string;recomputedReplayHash:string})=>({ok:input.replayHash===input.recomputedReplayHash});
