import { LiveDataError, SectionLabel, StatusPill } from './shared/Foundation'
import { useRecommendationExplainability } from '../hooks/useRecommendationExplainability'
import { useTrustResolutionData } from '../hooks/useTrustResolutionData'

function money(value: number) { return `$${Math.round(Number(value || 0)).toLocaleString()}` }
function bandStatus(band: string) { return band === 'BLOCKED' ? 'blocked' : band === 'LOW_CONFIDENCE' || band === 'INVESTIGATE' ? 'degraded' : 'ready' }

export function RecommendationExplainabilityDrawer({ recommendationId, findingId, onClose, onSelectRecommendation }: { recommendationId?: string | null; findingId?: string | null; onClose: () => void; onSelectRecommendation?: (id: string) => void }) {
  const explanation = useRecommendationExplainability(recommendationId)
  const resolution = useTrustResolutionData(findingId)
  const data = explanation.data
  const affected = resolution.data?.affectedRecommendations ?? resolution.data?.affectedRecommendations ?? []
  if (!recommendationId && !findingId) return null
  return <aside role='dialog' aria-label='Recommendation explainability drawer' style={{position:'fixed',right:0,top:0,bottom:0,width:460,background:'var(--bg-card)',borderLeft:'var(--border-default)',padding:16,overflow:'auto',zIndex:20}}>
    <button onClick={onClose} style={{float:'right'}}>Close</button>
    <h2>Recommendation explainability</h2>
    {explanation.error && <LiveDataError error={explanation.error} onRetry={() => void explanation.refresh()} />}
    {resolution.error && <LiveDataError error={resolution.error} onRetry={() => void resolution.refresh()} />}
    {findingId && <section style={{border:'var(--border-default)',borderRadius:10,padding:10,marginBottom:12}}><SectionLabel>Affected recommendations</SectionLabel><p>{money(resolution.data?.blockedValue ?? resolution.data?.finding?.affectedValue ?? 0)} blocked value for this finding.</p>{affected.slice(0,3).map((rec:any)=><button key={rec.recommendationId} onClick={()=>onSelectRecommendation?.(rec.recommendationId)} style={{display:'block',margin:'4px 0'}}>{rec.actionType ?? rec.playbookId} · {money(rec.unlockValue ?? rec.blockedValue ?? rec.projectedSavings)}</button>)}</section>}
    {data ? <div style={{display:'grid',gap:12}}>
      <section><SectionLabel>Why this recommendation exists</SectionLabel><p>{data.explanationSummary}</p><div><strong>{data.actionType}</strong> · {data.playbookId}</div></section>
      <section><SectionLabel>Why it is / is not safe to act</SectionLabel><div style={{display:'flex',gap:8,alignItems:'center'}}><StatusPill status={bandStatus(data.trustBand) as any} /><span>{data.trustBand}</span><span>{data.readinessState}</span></div></section>
      <section><SectionLabel>Evidence chain</SectionLabel>{data.evidenceChain?.map((step:any)=><div key={step.step} style={{borderTop:'var(--border-default)',padding:'6px 0'}}><strong>{step.label}</strong><div>{step.state}</div></div>)}</section>
      <section><SectionLabel>Trust blockers</SectionLabel>{(data.trustFindings ?? []).length === 0 ? <p>None.</p> : data.trustFindings.map((f:any)=><p key={f.findingId}>Blocked because {f.description} · {money(f.affectedValue)}</p>)}</section>
      <section><SectionLabel>Policy blockers</SectionLabel>{(data.policyFindings ?? []).length === 0 ? <p>None.</p> : data.policyFindings.map((f:any)=><p key={f.findingId}>{f.description} · {money(f.affectedValue)}</p>)}</section>
      <section><SectionLabel>Affected users/entities</SectionLabel>{data.affectedEntities?.map((e:any)=><p key={`${e.entityType}:${e.entityId}`}>{e.entityType}: {e.label ?? e.entityId}</p>)}</section>
      <section><SectionLabel>Unlock value</SectionLabel><strong>{money(data.unlockValue)}</strong></section>
      <section><SectionLabel>Recommended resolution steps</SectionLabel>{data.resolutionSteps?.map((step:any)=><a key={step.blockerType} href={step.linkTarget} style={{display:'block',margin:'6px 0'}}>{step.title} — {step.description} Unlock {money(step.unlockValue)}</a>)}</section>
    </div> : recommendationId ? <p>{explanation.loading ? 'Loading explainability…' : 'No explainability available.'}</p> : null}
  </aside>
}
