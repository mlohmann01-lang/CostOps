import { fetchFlexeraEntitlements } from './flexera-client';
export async function checkFlexeraReadiness(){
  const missing=['FLEXERA_BASE_URL','FLEXERA_CLIENT_ID','FLEXERA_CLIENT_SECRET'].filter((k)=>!(process.env[k]));
  if(missing.length>0 && (process.env.FLEXERA_MODE??'MOCK_CONNECTOR')!=='MOCK_CONNECTOR') return {status:'BLOCKED',connectorHealth:'FAILED',warnings:[],errors:[`Missing env: ${missing.join(',')}`]};
  try{ const sample=await fetchFlexeraEntitlements(); return {status:'READY',connectorHealth:'HEALTHY',warnings:[],errors:[],requestId:sample.requestId,count:sample.items.length}; }
  catch(e){ return {status:'BLOCKED',connectorHealth:'FAILED',warnings:[],errors:[e instanceof Error?e.message:'AUTH_FAILED']}; }
}
