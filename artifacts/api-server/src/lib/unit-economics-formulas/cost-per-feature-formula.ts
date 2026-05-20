import { ratio } from "./_shared"; export const computeCostPerFeature=(i:any)=>ratio(i.cost,i.feature ?? null,"cost/feature",i.confidence,i.assumptions,i.evidenceRefs,i.coefficients);
