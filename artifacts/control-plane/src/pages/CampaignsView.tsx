import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';

export default function CampaignsView() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { (async () => {
    await fetch('/api/campaigns/build', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ grouping: 'playbookType' }) });
    const data = await fetch('/api/campaigns').then((r)=>r.json());
    setRows(Array.isArray(data) ? data : []);
  })(); }, []);
  return <Layout><div className='space-y-3'><h1 className='text-2xl font-semibold'>Campaigns</h1>{rows.map((c)=><div key={c.campaignId} className='border rounded p-3 text-sm'><div className='font-semibold'>{c.campaignName}</div><div>Campaign priority: {Math.round(Number(c.totalOpportunityScore ?? 0))}</div><div>Total projected savings: ${Number(c.totalProjectedMonthlySavings).toFixed(2)}/mo · ${Number(c.totalProjectedAnnualSavings).toFixed(2)}/yr</div><div>Governance complexity: {Math.round(Number(c.governanceComplexity ?? 0))}</div><div>Rollback coverage: {Math.round(Number(c.rollbackCoverage ?? 0))}%</div><div>Recommendation count: {c.recommendationCount}</div><div>Grouped recommendations: {(c.recommendationIds ?? []).join(', ')}</div></div>)}</div></Layout>;
}
