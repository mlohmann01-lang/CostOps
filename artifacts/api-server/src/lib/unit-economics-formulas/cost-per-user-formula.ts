import { ratio } from "./_shared"; export const computeCostPerUser=(i:any)=>ratio(i.cost,i.user ?? null,"cost/user",i.confidence,i.assumptions,i.evidenceRefs,i.coefficients);
