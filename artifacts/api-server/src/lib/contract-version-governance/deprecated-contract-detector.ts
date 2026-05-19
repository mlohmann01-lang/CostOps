export const detectDeprecatedContractUsage=(i:{name:string;deprecated:string[]})=>({deprecated:i.deprecated.includes(i.name),governanceReview:true});
