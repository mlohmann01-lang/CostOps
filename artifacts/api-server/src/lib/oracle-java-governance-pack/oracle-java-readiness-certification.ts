export const oracleJavaReadiness=(owner?:string,contractEvidence?:boolean)=>({readiness:owner&&contractEvidence?"REVIEW_ONLY":"NOT_READY",governanceReview:true,executionReady:false});
