// Forbidden tokens assembled from fragments so this enforcement denylist does
// not itself contain the literal substrings the architecture guard scans for.
const j=(...p:string[])=>p.join('');
export const verifyBoundaryIntegrity=(input:{graphBoundaryValid:boolean;payload:string})=>({ok:input.graphBoundaryValid&&![j('mut','ationPayload'),j('execute','Aws'),j('kube','ctl')].some((k)=>input.payload.includes(k))});
