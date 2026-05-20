import type { QuantitativeDepthReportInput } from "./quantitative-depth-types";
import { evaluateCoefficientConfidence } from "./coefficient-confidence";
export const computeQuantitativeDepthReport=(input:QuantitativeDepthReportInput)=>({coefficients:input.coefficients,confidence:evaluateCoefficientConfidence({coefficients:input.coefficients,requestedConfidence:input.baseConfidence})});
