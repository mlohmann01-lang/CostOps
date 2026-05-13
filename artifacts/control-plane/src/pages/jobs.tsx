import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function JobsPage(){
 const qc=useQueryClient();
 const jobs=useQuery({queryKey:["jobs"],queryFn:async()=>fetch('/api/jobs').then(r=>r.json())});
 const runs=useQuery({queryKey:["job-runs"],queryFn:async()=>fetch('/api/jobs/runs').then(r=>r.json())});
 const dead=useQuery({queryKey:["dead"],queryFn:async()=>fetch('/api/jobs/dead-letter').then(r=>r.json())});
 const runDue=useMutation({mutationFn:async()=>fetch('/api/jobs/run-due',{method:'POST'}).then(r=>r.json()),onSuccess:()=>{qc.invalidateQueries({queryKey:["jobs"]});qc.invalidateQueries({queryKey:["job-runs"]});}});
 return <Layout><div className='space-y-6'><h1 className='text-2xl font-semibold'>Jobs / Orchestration</h1><Button onClick={()=>runDue.mutate()}>Run Due Jobs</Button>
 <section><h2 className='font-semibold'>Scheduled Jobs</h2>{(jobs.data??[]).map((j:any)=><div key={j.id} className='text-sm'>{j.jobType} · {j.tenantId} · {j.enabled} · {j.status}</div>)}</section>
 <section><h2 className='font-semibold'>Recent Runs</h2>{(runs.data??[]).map((r:any)=><div key={r.id} className='text-sm'>{r.jobType} · {r.status} · warnings {(r.warnings??[]).length} · errors {(r.errors??[]).length}</div>)}</section>
 <section><h2 className='font-semibold'>Dead Letter Jobs</h2>{(dead.data??[]).map((d:any)=><div key={d.id} className='text-sm'>{d.jobType} · {d.reason}</div>)}</section>
 </div></Layout>;
}
