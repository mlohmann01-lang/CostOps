const sample=[{id:'ent-1',userPrincipalName:'john.smith@contoso.com',productName:'M365 E5',skuId:'sku-e5',skuPartNumber:'E5',entitlementQuantity:100,consumedQuantity:89,cost:57,currency:'USD',contractId:'ctr-1'}];

export async function flexeraAuthToken(){return {accessToken:'mock-flexera-token',requestId:crypto.randomUUID()};}
export async function fetchFlexeraEntitlements(){
  const mode=process.env.FLEXERA_MODE??'MOCK_CONNECTOR';
  if(mode==='MOCK_CONNECTOR') return {items:sample,requestId:crypto.randomUUID()};
  const base=process.env.FLEXERA_BASE_URL!;
  const token=await flexeraAuthToken();
  const r=await fetch(`${base}/api/entitlements?limit=50`,{headers:{Authorization:`Bearer ${token.accessToken}`}});
  if(!r.ok) throw new Error(`FLEXERA_FETCH_FAILED_${r.status}`);
  const body=await r.json() as {items?:any[]};
  return {items:body.items??[],requestId:r.headers.get('x-request-id')??token.requestId};
}
