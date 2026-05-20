import type { CoefficientProvenance } from "./coefficient-provenance-types"; export const evaluateValidityWindow=(c:CoefficientProvenance,now:string)=>({stale:new Date(c.validUntil)<new Date(now)});
