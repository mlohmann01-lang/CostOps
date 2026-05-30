import { Shell } from '../components/layout/Shell'
import { EmptyState, LiveDataError, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { useBenchmarkIntelligenceData } from '../hooks/useBenchmarkIntelligenceData'

function money(value: number) { return `$${Math.round(value).toLocaleString()}` }
function pct(value: number) { return `${value}%` }
function impactStatus(value: string) { return value === 'HIGH' ? 'blocked' : value === 'MEDIUM' ? 'degraded' : 'ready' }
function label(value: string) { return value.replaceAll('_', ' ') }
function Card({ label, value, detail }: { label: string; value: string; detail: string }) { return <div style={{border:'var(--border-default)',background:'var(--bg-card)',borderRadius:12,padding:14}}><SectionLabel>{label}</SectionLabel><div style={{fontSize:28,marginTop:6}}>{value}</div><p style={{fontSize:12,color:'var(--text-secondary)',margin:'6px 0 0'}}>{detail}</p></div> }

export default function BenchmarkIntelligenceView() {
  const { data, error, isEmptyLive, refresh } = useBenchmarkIntelligenceData()
  return <Shell><div style={{padding:'16px 20px'}}><h1>Benchmark Intelligence</h1><p style={{color:'var(--text-secondary)',fontSize:13}}>Compare tenant performance to peer benchmarks and turn gaps into canonical opportunities.</p>{error && <LiveDataError error={error} onRetry={() => void refresh()} />}{isEmptyLive ? <EmptyState title='Benchmark intelligence not available yet' description='Connect tenant metrics to compare performance against peer benchmarks.' /> : <>
    <section data-testid='benchmark-summary' style={{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:12}}><Card label='Benchmarks Evaluated' value={String(data.summary.benchmarksEvaluated)} detail='Peer comparisons calculated.' /><Card label='High Impact Gaps' value={String(data.summary.highImpactGaps)} detail='Executive-level underperformance.' /><Card label='Recoverable Value' value={money(data.summary.recoverableValue)} detail='Potential value from benchmark gaps.' /><Card label='Generated Opportunities' value={String(data.summary.generatedOpportunities)} detail='Factory-ready opportunities.' /></section>
    <section data-testid='benchmark-table' style={{border:'var(--border-default)',background:'var(--bg-card)',borderRadius:12,padding:14,marginTop:14}}><SectionLabel>Benchmark Gaps</SectionLabel><div style={{display:'grid',gridTemplateColumns:'1.4fr .7fr .8fr .8fr .7fr 1.2fr',gap:8,fontSize:12,fontWeight:600,marginTop:10}}><span>Category</span><span>Tenant</span><span>Benchmark</span><span>Variance</span><span>Impact</span><span>Opportunity</span></div>{data.benchmarks.map((benchmark:any)=><div key={benchmark.id} style={{display:'grid',gridTemplateColumns:'1.4fr .7fr .8fr .8fr .7fr 1.2fr',gap:8,padding:'8px 0',borderTop:'var(--border-default)',fontSize:12,alignItems:'center'}}><span>{label(benchmark.category)}</span><span>{pct(benchmark.tenantValue)}</span><span>{pct(benchmark.benchmarkValue)}</span><span>{pct(benchmark.variancePercent)}</span><span><StatusPill status={impactStatus(benchmark.impactLevel) as any} /> {benchmark.impactLevel}</span><span>{benchmark.opportunity ?? 'Generate Campaign'}</span></div>)}</section>
  </>}</div></Shell>
}
