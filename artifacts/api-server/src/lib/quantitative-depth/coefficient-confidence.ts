import type { CoefficientInput } from "./quantitative-depth-types";
export const evaluateCoefficientConfidence=(input:{coefficients:CoefficientInput[];requestedConfidence:number})=>({cappedConfidence:Math.min(input.requestedConfidence,...input.coefficients.map(c=>c.confidence))});
