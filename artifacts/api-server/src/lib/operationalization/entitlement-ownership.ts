import { db, entitlementOwnershipEdgesTable, flexeraEntitlementsTable, m365UsersTable, servicenowContractsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
const k=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
export async function buildEntitlementOwnershipGraph({tenantId}:{tenantId:string}){
 const [f,m,c]=await Promise.all([db.select().from(flexeraEntitlementsTable).where(eq(flexeraEntitlementsTable.tenantId,tenantId)),db.select().from(m365UsersTable).where(eq(m365UsersTable.tenantId,tenantId)),db.select().from(servicenowContractsTable).where(eq(servicenowContractsTable.tenantId,tenantId))]);
 const ownerByApp=new Map<string, any>(c.map((x:any)=>[k(x.productName||x.vendor),x])); let created=0;
 for(const row of f){const appKey=k(row.productName||row.skuPartNumber||"unknown"); const own=ownerByApp.get(appKey); let conf=0.85; if(!own?.owner) conf-=0.25; await db.insert(entitlementOwnershipEdgesTable).values({tenantId,appKey,userPrincipalName:row.userPrincipalName,entitlementId:row.sourceObjectId,skuId:row.skuId,skuPartNumber:row.skuPartNumber,sourceSystem:"FLEXERA",owner:own?.owner,confidence:Math.max(0.1,conf),evidence:{contract:own?.contractNumber}}); created++;}
 for(const row of m){for(const sku of (row.assignedLicenses||[]) as string[]){const appKey=k(sku); const own=ownerByApp.get(appKey); let conf=0.75; if(!own?.owner) conf-=0.2; await db.insert(entitlementOwnershipEdgesTable).values({tenantId,appKey,userPrincipalName:row.userPrincipalName,skuPartNumber:sku,sourceSystem:"M365",owner:own?.owner,confidence:Math.max(0.1,conf),evidence:{m365:true}}); created++;}}
 return {created};
}
