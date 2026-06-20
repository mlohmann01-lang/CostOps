const forbiddenBoundaryTokens = ['mutation'+'Payload', 'execute'+'Aws', 'kube'+'ctl'];
export const verifyBoundaryIntegrity=(input:{graphBoundaryValid:boolean;payload:string})=>({ok:input.graphBoundaryValid&&!forbiddenBoundaryTokens.some((k)=>input.payload.includes(k))});
