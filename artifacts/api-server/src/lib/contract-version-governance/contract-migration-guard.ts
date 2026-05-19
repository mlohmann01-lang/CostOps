export const evaluateContractMigrationSafety=(i:{breakingChanges:number;coverage:number})=>({safe:i.breakingChanges===0&&i.coverage>=0.8,deterministicForecast:true});
