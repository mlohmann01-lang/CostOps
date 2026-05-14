import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const steps=["TENANT_SETUP","CONNECT_M365","RUN_READINESS","RUN_SMOKE_TEST","RUN_SYNC","RUN_OPERATIONALIZATION","RUN_PACK_OPTIONAL","GENERATE_RECOMMENDATIONS","REVIEW_SUMMARY"];
export default function OnboardingPage(){ const [data,setData]=useState<any>(null); const tenantId='default'; const refresh=()=>fetch(`/api/onboarding/status?tenantId=${tenantId}`).then(r=>r.json()).then(setData); useEffect(()=>{ void refresh(); },[]);
 const advance=async(step:string)=>{ await fetch('/api/onboarding/step',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenantId,step})}); refresh(); };
 return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Onboarding</h1><Card><CardHeader><CardTitle>Time-to-value wizard</CardTitle></CardHeader><CardContent><div className='grid gap-2'>{steps.map((s)=><div key={s} className='flex items-center justify-between border rounded p-2'><span>{s}</span><Button size='sm' variant='outline' onClick={()=>advance(s)}>Mark complete</Button></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Status</CardTitle></CardHeader><CardContent><pre className='text-xs'>{JSON.stringify(data,null,2)}</pre></CardContent></Card></div></Layout>; }
