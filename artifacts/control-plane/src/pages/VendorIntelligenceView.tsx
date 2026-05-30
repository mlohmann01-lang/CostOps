import { Shell } from '../components/layout/Shell'
import { EmptyState, LiveDataError, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { useVendorIntelligenceData } from '../hooks/useVendorIntelligenceData'

function money(value: number) { return `$${Math.round(value).toLocaleString()}` }
function severityStatus(severity: string) { return severity === 'CRITICAL' || severity === 'HIGH' ? 'blocked' : severity === 'MEDIUM' ? 'degraded' : 'ready' }

function Card({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div style={{border:'var(--border-default)',background:'var(--bg-card)',borderRadius:12,padding:14}}><SectionLabel>{label}</SectionLabel><div style={{fontSize:28,marginTop:6}}>{value}</div><p style={{fontSize:12,color:'var(--text-secondary)',margin:'6px 0 0'}}>{detail}</p></div>
}

export default function VendorIntelligenceView() {
  const { data, error, isEmptyLive, refresh, assessChange, generateOpportunities } = useVendorIntelligenceData()
  const summary = data.summary
  return <Shell><div style={{padding:'16px 20px'}}><h1>Vendor Intelligence</h1><p style={{color:'var(--text-secondary)',fontSize:13}}>Vendor Change Detection Engine monitors external vendor changes and turns them into governed opportunities.</p>{error && <LiveDataError error={error} onRetry={() => void refresh()} />}{isEmptyLive ? <EmptyState title='Vendor intelligence not available yet' description='Connect live vendor sources or enable demo mode to review vendor change impact.' /> : <>
    <section data-testid='vendor-intelligence-summary' style={{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:12}}><Card label='Vendor Changes Detected' value={String(summary.vendorChangesDetected)} detail='Changes found across vendor feeds.' /><Card label='High Impact' value={String(summary.highImpact)} detail='Requires operator review.' /><Card label='Affected Spend' value={money(summary.affectedSpend)} detail='Potential spend exposure.' /><Card label='Generated Opportunities' value={String(summary.generatedOpportunities)} detail='Candidate governed actions.' /></section>
    <section data-testid='vendor-change-feed' style={{border:'var(--border-default)',background:'var(--bg-card)',borderRadius:12,padding:14,marginTop:14}}><SectionLabel>Change Feed</SectionLabel><div style={{display:'grid',gridTemplateColumns:'120px 1.4fr .7fr 1fr .8fr 210px',gap:8,fontSize:12,fontWeight:600,marginTop:10}}><span>Vendor</span><span>Change</span><span>Severity</span><span>Potential Impact</span><span>Generated</span><span>Actions</span></div>{data.changes.map((change:any)=><div key={change.id} style={{display:'grid',gridTemplateColumns:'120px 1.4fr .7fr 1fr .8fr 210px',gap:8,padding:'8px 0',borderTop:'var(--border-default)',fontSize:12,alignItems:'center'}}><span>{change.vendor}</span><span><strong>{change.title}</strong><div style={{color:'var(--text-secondary)'}}>{change.description}</div></span><span><StatusPill status={severityStatus(change.impactSeverity) as any} /> {change.impactSeverity}</span><span>{money(change.potentialImpact ?? change.affectedSpend ?? 0)}</span><span>{change.generatedOpportunityCount} recommendations</span><span style={{display:'flex',gap:6}}><button onClick={()=>void assessChange(change.id)}>Assess</button><button onClick={()=>void generateOpportunities(change.id)}>Generate opportunities</button></span></div>)}</section>
  </>}</div></Shell>
}
