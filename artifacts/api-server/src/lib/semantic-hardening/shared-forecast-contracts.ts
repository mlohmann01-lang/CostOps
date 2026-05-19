import type { EconomicForecastWindow } from './shared-economic-dtos';
export const assertForecastWindow=(w:EconomicForecastWindow)=>{ if(w.horizonDays<1||!w.startDate||!w.endDate) throw new Error('Invalid forecast window'); };
