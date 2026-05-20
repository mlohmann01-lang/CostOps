import type { CoefficientInput } from "./quantitative-depth-types";
export const evaluateCoefficientVersioning=(input:{coefficient:CoefficientInput})=>({version:input.coefficient.version,valid:/^v?\d+\.\d+\.\d+$/.test(input.coefficient.version)});
