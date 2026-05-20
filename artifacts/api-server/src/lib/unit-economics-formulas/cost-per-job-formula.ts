import { ratio } from "./_shared"; export const computeCostPerJob=(i:any)=>ratio(i.cost,i.job ?? null,"cost/job",i.confidence,i.assumptions,i.evidenceRefs,i.coefficients);
