export const computeRecurrenceAdjustedSavings=(i:{savings:number;recurrencePressure:number})=>({adjustedSavings:i.savings*(1-i.recurrencePressure)});
