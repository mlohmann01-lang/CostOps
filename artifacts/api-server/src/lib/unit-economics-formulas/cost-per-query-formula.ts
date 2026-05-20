import { ratio } from "./_shared"; export const computeCostPerQuery=(i:any)=>ratio(i.cost,i.query ?? null,"cost/query",i.confidence,i.assumptions,i.evidenceRefs,i.coefficients);
