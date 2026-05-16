import { Layout } from "@/components/layout";

const sections = ["Open Reviews","Assigned to Me","Trust Reviews","Reconciliation Reviews","Policy Exceptions","Approval Required","Breached SLA"];

export default function WorkflowCenterPage(){
  return <Layout>
    <h1 className='text-2xl font-semibold'>Operations Inbox</h1>
    <p className='text-sm text-muted-foreground mt-2'>Workflow decisions are audited and do not bypass governance controls.</p>
    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mt-6'>
      {sections.map((s)=><div key={s} className='rounded border p-4 bg-card'><h2 className='font-medium'>{s}</h2></div>)}
    </div>
    <section className='mt-6 rounded border p-4 bg-card'>
      <h2 className='font-medium'>Policy Exception Review</h2>
      <p className='text-sm text-muted-foreground mt-2'>Exceptions expire automatically and preserve policy lineage.</p>
    </section>
  </Layout>;
}
