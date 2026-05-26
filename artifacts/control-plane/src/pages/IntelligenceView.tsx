import { useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { CONNECTORS, GOVERNANCE_ACTIONS } from '../lib/mockData'
import { formatCurrency } from '../lib/formatters'
import type { Domain } from '../types/connector'
import { useRuntimeContext } from '../lib/runtimeContext'

const SPEND_DATA = [
  { month: 'Dec', spend: 165000 },
  { month: 'Jan', spend: 175000 },
  { month: 'Feb', spend: 190000 },
  { month: 'Mar', spend: 220000 },
  { month: 'Apr', spend: 210000 },
  { month: 'May', spend: 185000 },
]

const DOMAIN_CARDS = [
  { name: 'SaaS / M365', conf: 94, value: 42840, total: 76000, risk: 'Low risk', color: '#1D9E75' },
  { name: 'Cloud / AWS', conf: 82, value: 28400, total: 76000, risk: 'Medium risk', color: '#EF9F27' },
  { name: 'AI / OpenAI', conf: 76, value: 19600, total: 76000, risk: 'Low risk', color: '#1D9E75' },
  { name: 'Data / Analytics', conf: 52, value: 8200, total: 76000, risk: 'Medium risk', color: '#EF9F27' },
]

function confColor(pct: number): string {
  if (pct >= 80) return '#1D9E75'
  if (pct >= 60) return '#EF9F27'
  return '#E24B4A'
}

const toConnectorTabs = (rows: typeof CONNECTORS) => rows.map(c => ({
  id: c.id, name: c.name, domain: 'all' as Domain, description: c.name,
  iconType: 'saas' as const, readiness: c.readiness, enabled: true, lastSyncAt: null, evidenceSources: [],
}))

interface IntelligenceViewProps { params?: { domain?: string } }

export default function IntelligenceView({ params }: IntelligenceViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const runtime = useRuntimeContext()
  const isDemo = runtime.environment === 'DEMO'

  const recs = useMemo(() => {
    const base = domain === 'all' ? GOVERNANCE_ACTIONS : GOVERNANCE_ACTIONS.filter(a => a.domain === domain)
    return base.map(a => ({
      ...a,
      confidence: a.verdict === 'GOVERNED_EXECUTION_ELIGIBLE' ? 94 : a.verdict === 'APPROVAL_REQUIRED' ? 76 : 52,
      recurrence: a.blastRadius === 'LOW' ? 'Low' : a.blastRadius === 'MEDIUM' ? 'Medium' : 'High',
    }))
  }, [domain])

  const totalIdentified = recs.reduce((s, r) => s + r.savingAmount, 0)
  const eligible = recs.filter(r => r.verdict === 'GOVERNED_EXECUTION_ELIGIBLE').reduce((s, r) => s + r.savingAmount, 0)
  const pending = recs.filter(r => r.verdict === 'APPROVAL_REQUIRED').reduce((s, r) => s + r.savingAmount, 0)
  const realised = Math.round(eligible * 0.22)

  const funnel = [
    { label: 'Identified', value: totalIdentified, pct: 100, color: 'rgba(136,135,128,0.55)', borderColor: '#888780' },
    { label: 'Eligible', value: eligible, pct: Math.round(eligible / totalIdentified * 100) || 0, color: '#1D9E75', borderColor: '#1D9E75' },
    { label: 'Pending', value: pending, pct: Math.round(pending / totalIdentified * 100) || 0, color: '#EF9F27', borderColor: '#EF9F27' },
    { label: 'Realised', value: realised, pct: Math.round(realised / totalIdentified * 100) || 0, color: '#5DCAA5', borderColor: '#5DCAA5' },
  ]

  const heroMetrics = [
    { label: 'Total identified', value: formatCurrency(totalIdentified), delta: '↑ $12,400 vs last month', deltaColor: '#1D9E75', hero: false },
    { label: 'Eligible now', value: formatCurrency(eligible), delta: 'governance-certified', deltaColor: '#1D9E75', hero: true },
    { label: 'Pending approval', value: formatCurrency(pending), delta: 'Awaiting 2nd approver', deltaColor: '#EF9F27', hero: false },
    { label: 'Realised this month', value: formatCurrency(realised), delta: '↑ $2,100 vs last month', deltaColor: '#1D9E75', hero: false },
  ]

  const TH: React.CSSProperties = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.22)', padding: '9px 14px', textAlign: 'left' }
  const COL = '1fr 110px 120px 110px'

  return (
    <Shell>
      {/* Page header + domain tabs */}
      <div style={{ padding: '18px 24px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0a0c0b', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 15, fontWeight: 500, color: '#e8e6e0', margin: 0 }}>Intelligence</h1>
          <span style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 6, color: 'rgba(255,255,255,0.30)' }}>Dec 2025 – May 2026</span>
        </div>
        <DomainTabs connectors={toConnectorTabs(CONNECTORS)} currentDomain={domain} basePath="/:domain/intelligence" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {isDemo && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: 'rgba(239,159,39,0.07)', border: '0.5px solid rgba(239,159,39,0.18)', borderRadius: 5, fontSize: 11, color: 'rgba(239,159,39,0.65)', marginBottom: 20 }}>
            DEMO · All figures are synthetic. Financial data is illustrative only.
          </div>
        )}

        {/* Hero metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {heroMetrics.map(m => (
            <div key={m.label} style={{ padding: '18px 20px', background: m.hero ? 'rgba(29,158,117,0.07)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${m.hero ? 'rgba(29,158,117,0.28)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.32)', marginBottom: 8 }}>{m.label}</div>
              <div style={{ fontSize: m.hero ? 26 : 22, fontWeight: 500, color: m.hero ? '#1D9E75' : '#e8e6e0', lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 11, color: m.deltaColor, marginTop: 6, opacity: 0.80 }}>{m.delta}</div>
            </div>
          ))}
        </div>

        {/* Spend trend chart */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)' }}>
            Spend trend — governed savings impact
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 12px 8px', marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={SPEND_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#1D9E75" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.32)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.32)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} width={50} domain={[100000, 250000]} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Spend']}
                contentStyle={{ background: '#111413', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 8, fontSize: 11, fontFamily: 'inherit', color: '#e8e6e0' }}
                labelStyle={{ color: 'rgba(255,255,255,0.45)' }}
              />
              <ReferenceLine x="Mar" stroke="rgba(239,159,39,0.40)" strokeDasharray="4 4" label={{ value: 'Peak — actions initiated', fill: '#EF9F27', fontSize: 10, position: 'top' }} />
              <ReferenceLine x="May" stroke="rgba(29,158,117,0.40)" strokeDasharray="4 4" label={{ value: 'Savings landing', fill: '#1D9E75', fontSize: 10, position: 'top' }} />
              <Area type="monotone" dataKey="spend" stroke="#1D9E75" strokeWidth={2} fill="url(#tealGrad)"
                dot={(props: any) => {
                  const { cx, cy, index } = props
                  const fill = index === 3 ? '#EF9F27' : '#1D9E75'
                  const r = index === 3 || index === 5 ? 5 : 3
                  return <circle key={index} cx={cx} cy={cy} r={r} fill={fill} stroke="none" />
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: '6px 6px 0', lineHeight: 1.5 }}>
            Governed actions applied in April/May, driving spend down versus baseline trajectory.
          </p>
        </div>

        {/* Two-column: Funnel + Domain cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Savings funnel */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>Savings funnel</div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnel.map(f => (
                <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 44px', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{f.label}</span>
                  <div style={{ height: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${f.pct}%`, background: f.color === '#1D9E75' || f.color === '#5DCAA5' ? `rgba(29,158,117,${f.color === '#5DCAA5' ? '0.25' : '0.30'})` : f.color === '#EF9F27' ? 'rgba(239,159,39,0.30)' : 'rgba(136,135,128,0.25)', borderLeft: `3px solid ${f.borderColor}`, borderRadius: 20, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: f.color === 'rgba(136,135,128,0.55)' ? '#e8e6e0' : f.color, whiteSpace: 'nowrap' as const }}>
                        {formatCurrency(f.value)}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', textAlign: 'right' as const }}>{f.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunity by domain */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>Opportunity by domain</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {DOMAIN_CARDS.map(d => (
                <div key={d.name} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#e8e6e0' }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: confColor(d.conf), fontWeight: 500 }}>{d.conf}%</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: '#e8e6e0', lineHeight: 1, marginBottom: 8 }}>{formatCurrency(d.value)}</div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(d.value / d.total * 100)}%`, background: d.color, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{Math.round(d.value / d.total * 100)}% of total · {d.risk}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations table */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)' }}>
            Recommendations ({recs.length})
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: COL, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            {['Recommendation', 'Saving', 'Confidence', 'Recurrence risk'].map(h => (
              <div key={h} style={TH}>{h}</div>
            ))}
          </div>
          {recs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>No recommendations for this domain.</div>
          ) : recs.map((r, i) => {
            const isLast = i === recs.length - 1
            const cell: React.CSSProperties = { padding: '12px 14px', borderBottom: isLast ? 'none' : '0.5px solid rgba(255,255,255,0.05)', fontSize: 13 }
            const recColor = r.recurrence === 'Low' ? '#1D9E75' : r.recurrence === 'Medium' ? '#EF9F27' : '#E24B4A'
            const confBar = confColor(r.confidence)
            return (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: COL }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <div style={{ ...cell }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e6e0' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{r.description}</div>
                </div>
                <div style={{ ...cell, fontWeight: 500, color: '#e8e6e0' }}>
                  {formatCurrency(r.savingAmount)}<span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>/mo</span>
                </div>
                <div style={{ ...cell }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.confidence}%`, background: confBar, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: confBar, minWidth: 30 }}>
                      {r.confidence}%
                      {r.confidence < 60 && <span title="Low confidence due to unconfigured connector. Connect ITAM data to improve accuracy." style={{ marginLeft: 4, cursor: 'help', opacity: 0.7 }}>ⓘ</span>}
                    </span>
                  </div>
                </div>
                <div style={{ ...cell, fontSize: 12, fontWeight: 500, color: recColor }}>{r.recurrence}</div>
              </div>
            )
          })}
        </div>
      </div>
      <CommandBar />
    </Shell>
  )
}
