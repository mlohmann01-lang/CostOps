import type { CoefficientProvenance } from "./coefficient-provenance-types"; export const evaluateBenchmarkOrigin=(c:CoefficientProvenance)=>({hasOrigin:c.sources.length>0,provenance:c.provenance});
