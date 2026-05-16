import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OperationalEntityGraphPage(){
  const [entities,setEntities]=useState<any[]>([]); const [relationships,setRelationships]=useState<any[]>([]); const [integrity,setIntegrity]=useState<any>(null);
  useEffect(()=>{fetch('/api/graph/entities?tenantId=default').then(r=>r.json()).then(setEntities); fetch('/api/graph/relationships?tenantId=default').then(r=>r.json()).then(setRelationships); fetch('/api/graph/integrity?tenantId=default').then(r=>r.json()).then(setIntegrity);},[]);
  return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Operational Entity Graph</h1><p className='text-sm text-muted-foreground'>Relationships are evidence-derived and confidence-scored.</p>
    <Card><CardHeader><CardTitle>Entity Detail</CardTitle></CardHeader><CardContent><div className='space-y-1 text-xs'>{entities.slice(0,50).map(e=><div key={e.id} className='border rounded p-2'>{e.entityType} · {e.canonicalName} · key={e.canonicalKey} · confidence={e.entityConfidenceScore} · trust={e.entityTrustScore} · orphan={String(e.isOrphaned)} · duplicate={String(e.isDuplicateCandidate)}</div>)}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Relationship Graph</CardTitle></CardHeader><CardContent><div className='space-y-1 text-xs'>{relationships.slice(0,100).map((r:any)=><div key={r.id} className='border rounded p-2'>{r.fromEntityId} → {r.toEntityId} · {r.relationshipType} · conf={r.relationshipConfidenceScore} · trust={r.relationshipTrustScore} · source={r.sourceSystem}</div>)}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Graph Integrity Panel</CardTitle></CardHeader><CardContent><pre className='text-xs whitespace-pre-wrap'>{JSON.stringify(integrity, null, 2)}</pre></CardContent></Card>
  </div></Layout>
}
