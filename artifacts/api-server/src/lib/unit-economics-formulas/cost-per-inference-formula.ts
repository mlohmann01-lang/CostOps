import { ratio } from "./_shared"; export const computeCostPerInference=(i:any)=>ratio(i.cost,i.inference ?? null,"cost/inference",i.confidence,i.assumptions,i.evidenceRefs,i.coefficients);
