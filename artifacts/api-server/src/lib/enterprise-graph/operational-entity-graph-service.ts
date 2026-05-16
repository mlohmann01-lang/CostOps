import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, entityCorrelationSnapshotsTable, operationalEntitiesTable, operationalEntityEdgesTable, recommendationsTable } from "@workspace/db";

const h = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const clamp=(n:number)=>Math.max(0,Math.min(100,n));

export class OperationalEntityGraphService {
  async rebuild(tenantId: string) {
    const recs = await db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId));
    const entities:any[]=[]; const edges:any[]=[];
    for (const r of recs) {
      const userKey = String(r.userEmail||r.targetEntityId||`rec-${r.id}`).toLowerCase();
      const licKey = String(r.licenceSku||"unknown").toLowerCase();
      entities.push(this.entity(tenantId,"USER",r.displayName||userKey,userKey,"m365",r));
      entities.push(this.entity(tenantId,"LICENSE",r.licenceSku||"UNKNOWN",licKey,"m365",r));
      edges.push(this.edge(tenantId,`USER:${userKey}`,`LICENSE:${licKey}`,"LICENSED_FOR",r));
      if (r.playbook) entities.push(this.entity(tenantId,"APPLICATION",r.playbook,r.playbook.toLowerCase(),"playbook",r));
      if (r.playbook) edges.push(this.edge(tenantId,`USER:${userKey}`,`APPLICATION:${r.playbook.toLowerCase()}`,"CONSUMES",r));
    }
    const uniqE = new Map<string, any>(); entities.forEach(e=>uniqE.set(`${e.entityType}:${e.canonicalKey}`, e));
    const savedEntities:any[]=[];
    for (const e of uniqE.values()) {
      const [existing] = await db.select().from(operationalEntitiesTable).where(and(eq(operationalEntitiesTable.tenantId,tenantId),eq(operationalEntitiesTable.entityType,e.entityType),eq(operationalEntitiesTable.canonicalKey,e.canonicalKey))).limit(1);
      const row = existing ? (await db.update(operationalEntitiesTable).set(e).where(eq(operationalEntitiesTable.id, existing.id)).returning())[0] : (await db.insert(operationalEntitiesTable).values(e).returning())[0];
      savedEntities.push(row);
    }
    const byKey=new Map(savedEntities.map((e:any)=>[`${e.entityType}:${e.canonicalKey}`,e]));
    for (const raw of edges) {
      const from = byKey.get(raw.fromEntityKey); const to = byKey.get(raw.toEntityKey); if(!from||!to) continue;
      await db.insert(operationalEntityEdgesTable).values({...raw, fromEntityId:String(from.id), toEntityId:String(to.id)});
    }
    return this.integrity(tenantId);
  }

  entity(tenantId:string, entityType:string, canonicalName:string, canonicalKey:string, sourceSystem:string, r:any){
    const confidence = this.identityConfidence({upn:r.userEmail,email:r.userEmail,employeeId:r.targetEntityId,department:r.metadata?.department,costCenter:r.metadata?.costCenter});
    return {tenantId, entityType, canonicalName, canonicalKey, sourceSystem, entityConfidenceScore:confidence, entityTrustScore:clamp((r.trustScore??0)*100), isOrphaned:false, isDuplicateCandidate:false, sourceReferences:[{recommendationId:r.id}], metadata:{connector:r.connector,playbookId:r.playbookId}};
  }
  edge(tenantId:string, fromEntityKey:string, toEntityKey:string, relationshipType:string, r:any){
    const relationshipConfidenceScore=clamp(60 + ((r.pricingConfidence||"").startsWith("VERIFIED")?30:10));
    return {tenantId, fromEntityKey, toEntityKey, relationshipType, relationshipConfidenceScore, relationshipTrustScore:clamp((r.trustScore??0)*100), sourceSystem:r.connector||"m365", sourceReferenceId:String(r.id), edgeProvenance:{evidenceDerived:true,timestamp:new Date().toISOString(),source:"recommendations"}, edgeMetadata:{playbookId:r.playbookId}, isActive:true};
  }
  identityConfidence(input:any){ let s=0; if(input.upn&&input.email&&String(input.upn).toLowerCase()===String(input.email).toLowerCase()) s=100; else if(input.upn||input.email) s=85; if(input.employeeId) s=Math.max(s,90); if(input.department&&input.costCenter) s=Math.max(s,80); return s||40; }

  async correlations(tenantId:string, entityId:string){
    const edges=await db.select().from(operationalEntityEdgesTable).where(and(eq(operationalEntityEdgesTable.tenantId,tenantId),eq(operationalEntityEdgesTable.fromEntityId,entityId),eq(operationalEntityEdgesTable.isActive,true)));
    const correlatedEntityIds=edges.map((e:any)=>e.toEntityId);
    const correlation={tenantId,entityId,correlationType:"DIRECT_EDGE",correlatedEntityIds,correlationConfidence:edges.length?85:30,correlationReasoning:["Deterministic edge traversal"],deterministicHash:h({tenantId,entityId,correlatedEntityIds}),correlationEngineVersion:"entity-correlation-v1"};
    await db.insert(entityCorrelationSnapshotsTable).values(correlation);
    return correlation;
  }

  async integrity(tenantId:string){
    const entities=await db.select().from(operationalEntitiesTable).where(eq(operationalEntitiesTable.tenantId,tenantId));
    const edges=await db.select().from(operationalEntityEdgesTable).where(eq(operationalEntityEdgesTable.tenantId,tenantId));
    const linked=new Set(edges.flatMap((e:any)=>[e.fromEntityId,e.toEntityId]));
    const orphaned=entities.filter((e:any)=>!linked.has(String(e.id)));
    const dupMap=new Map<string,any[]>(); entities.forEach((e:any)=>dupMap.set(e.canonicalKey,[...(dupMap.get(e.canonicalKey)||[]),e]));
    const duplicates=[...dupMap.values()].filter(v=>v.length>1).flat();
    const lowConfidenceRelationships=edges.filter((e:any)=>e.relationshipConfidenceScore<50);
    const graphIntegrityScore=clamp(100 - orphaned.length*5 - duplicates.length*3 - lowConfidenceRelationships.length*2);
    return { orphanedEntities: orphaned, duplicateCandidates: duplicates, lowConfidenceRelationships, graphIntegrityScore };
  }
}
