export const verifyPolicyIntegrity=(input:{policyValid:boolean;arbitrationConsistent:boolean})=>({ok:input.policyValid&&input.arbitrationConsistent});
