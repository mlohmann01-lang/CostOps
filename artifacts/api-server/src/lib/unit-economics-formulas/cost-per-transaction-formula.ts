import { ratio } from "./_shared"; export const computeCostPerTransaction=(i:any)=>ratio(i.cost,i.transaction ?? null,"cost/transaction",i.confidence,i.assumptions,i.evidenceRefs,i.coefficients);
