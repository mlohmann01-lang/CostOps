import type { CoefficientInput } from "./quantitative-depth-types";
export const evaluateCoefficientSourceGovernance=(input:{coefficient:CoefficientInput})=>({governed:input.coefficient.source.length>0&&input.coefficient.evidenceRefs.length>0});
