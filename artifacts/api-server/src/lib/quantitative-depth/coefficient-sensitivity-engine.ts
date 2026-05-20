import type { CoefficientInput } from "./quantitative-depth-types";
export const evaluateCoefficientSensitivity=(input:{coefficients:CoefficientInput[]})=>input.coefficients.map((c)=>({id:c.id,impactScore:Math.abs(c.value)}));
