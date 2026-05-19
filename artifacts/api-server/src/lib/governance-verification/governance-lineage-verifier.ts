export const verifyLineageIntegrity=(input:{lineageRefs:string[];evidenceRefs:string[]})=>({ok:input.lineageRefs.length>0&&input.evidenceRefs.length>0});
