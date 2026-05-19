export const forecastBudgetVariance=(i:{forecast:number;budget:number;assumptions:string[]})=>({variance:i.forecast-i.budget,assumptions:i.assumptions});
