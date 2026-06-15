import { OperationalGraphRepository } from '../operational-graph/repository';
export class EconomicGraphRepository extends OperationalGraphRepository {}
export class InMemoryEconomicGraphRepository {
  nodes:any[]=[]; edges:any[]=[];
  async createNode(input:any){const existing=this.nodes.find(n=>n.tenantId===input.tenantId&&n.canonicalKey===input.canonicalKey); if(existing){Object.assign(existing,input,{sourceReferences:[...(existing.sourceReferences??[]),...(input.sourceReferences??[])]}); return existing} const row={id:input.canonicalKey,type:input.entityType,...input}; this.nodes.push(row); return row}
  async createEdge(input:any){const existing=this.edges.find(e=>e.tenantId===input.tenantId&&e.fromEntityId===input.fromEntityId&&e.toEntityId===input.toEntityId&&e.relationshipType===input.relationshipType); if(existing)return existing; const row={id:`edge-${this.edges.length+1}`,type:input.relationshipType,from:input.fromEntityId,to:input.toEntityId,...input}; this.edges.push(row); return row}
  async listNodes(tenantId:string){return this.nodes.filter(n=>n.tenantId===tenantId)}
  async listEdges(tenantId:string){return this.edges.filter(e=>e.tenantId===tenantId)}
  async findNodeByKey(tenantId:string,canonicalKey:string){return this.nodes.find(n=>n.tenantId===tenantId&&n.canonicalKey===canonicalKey)??null}
}
