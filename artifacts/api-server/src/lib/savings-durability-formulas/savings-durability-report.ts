import { computeRecurrenceAdjustedSavings } from "./recurrence-adjusted-savings";
export const computeSavingsDurabilityReport=(i:any)=>({adjusted:computeRecurrenceAdjustedSavings(i.recurrence),decay: i.decay});
