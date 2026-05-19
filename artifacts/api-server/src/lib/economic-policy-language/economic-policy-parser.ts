import type { EconomicPolicy } from './economic-policy-types';export const parseEconomicPolicy=(input:string):EconomicPolicy=>JSON.parse(input) as EconomicPolicy;
