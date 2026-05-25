import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { CONNECTORS, GOVERNANCE_ACTIONS } from '../lib/mockData'
import { formatCurrency } from '../lib/formatters'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import type { Domain } from '../types/connector'

const SPEND_TREND = [
  { month: 'Dec', spend: 187400 },
  { month: 'Jan', spend: 201200 },
  { month: 'Feb', spend: 194800 },
  { month: 'Mar', spend: 218600 },
  { month: 'Apr', spend: 203400 },
  { month: 'May', spend: 196200 },
]

const CONFIDENCE_COLOR: Record<number, string> = {}
function confidenceColor(pct: number): string {
  if (pct >= 85) return 'var(--c-teal-600)'
  if (pct >= 70) return 'var(--c-amber-600)'
  return 'var(--c-red-600)'
}
function recurrenceColor(level: string): string {
  if (level === 'Low') return 'var(--c-teal-600)'
  if (level === 'Medium') return 'var(--c-amber-600)'
  return 'var(--c-red-600)'
}

const RECOMMENDATIONS = GOVERNANCE_ACTIONS.map(a => ({
  ...a,
  confidence: a.verdict === 'GOVERNED_EXECUTION_ELIGIBLE' ? 94 : a.verdict === 'APPROVAL_REQUIRED' ? 76 : 52,
  recurrence: a.blastRadius === 'LOW' ? 'Low' : a.blastRadius === 'MEDIUM' ? 'Medium' : 'High',
}))

interface IntelligenceViewProps {
  params?: { domain?: string }
}

export default function IntelligenceView({ params }: IntelligenceViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const recs = domain === 'all' ? RECOMMENDATIONS : RECOMMENDATIONS.filter(r => r.domain === domain)
  const funnel = [
    { stage: 'Identified', value: recs.reduce((s, r) => s + r.savingAmount, 0) },
    { stage: 'Eligible', value: recs.filter(r => r.verdict === 'GOVERNED_EXECUTION_ELIGIBLE').reduce((s, r) => s + r.savingAmount, 0) },
    { stage: 'Approved', value: recs.filter(r => r.verdict === 'APPROVAL_REQUIRED').reduce((s, r) => s + r.savingAmount, 0) },
    { stage: 'Executing', value: recs.filter(r => r.verdict === 'GOVERNED_EXECUTION_ELIGIBLE').reduce((s, r) => s + Math.round(r.savingAmount * 0.35), 0) },
    { stage: 'Verified', value: recs.filter(r => r.verdict === 'GOVERNED_EXECUTION_ELIGIBLE').reduce((s, r) => s + Math.round(r.savingAmount * 0.22), 0) },
    { stage: 'Blocked', value: recs.filter(r => r.verdict === 'MANUAL_ONLY' || r.verdict === 'NEVER_ELIGIBLE').reduce((s, r) => s + r.savingAmount, 0) },
  ]

  return (
    <Shell>
      <div style={{
        padding: '16px 20px 0',
        borderBottom: '0.5px solid var(--border-subtle)',
        background: 'var(--surface-0)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Intelligence</h1>
          <span style={{
            fontSize: 11, padding: '3px 9px',
            background: 'var(--surface-2)', border: '0.5px solid var(--border-subtle)',
            borderRadius: 6, color: 'var(--text-tertiary)',
          }}>
            Dec 2025 – May 2026
          </span>
        </div>
        <DomainTabs connectors={CONNECTORS} currentDomain={domain} basePath="/:domain/intelligence" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        {/* Spend trend */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Spend trend — all connectors
          </span>
        </div>
        <div style={{
          background: 'var(--surface-0)', border: '0.5px solid var(--border-subtle)',
          borderRadius: 12, padding: '16px 12px 8px', marginBottom: 20,
        }}>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={SPEND_TREND} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: 'IBM Plex Sans, sans-serif' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: 'IBM Plex Sans, sans-serif' }}
                axisLine={false} tickLine={false} width={50}
              />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Spend']}
                contentStyle={{
                  background: 'var(--surface-0)', border: '0.5px solid var(--border-subtle)',
                  borderRadius: 8, fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              <Line
                type="monotone" dataKey="spend"
                stroke="var(--c-teal-400)" strokeWidth={1.5}
                dot={false} activeDot={{ r: 3, fill: 'var(--c-teal-400)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>


        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Savings funnel lifecycle
          </span>
        </div>
        <div style={{
          background: 'var(--surface-0)', border: '0.5px solid var(--border-subtle)',
          borderRadius: 12, padding: '16px 12px 8px', marginBottom: 20,
        }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={funnel}>
              <CartesianGrid stroke="var(--border-subtle)" />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Savings']} />
              <Bar dataKey="value" fill="var(--c-blue-400)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendations */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recommendations ({recs.length})
          </span>
        </div>
        <div style={{ background: 'var(--surface-0)', border: '0.5px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.8fr 0.8fr', padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '0.5px solid var(--border-subtle)' }}>
            {['Recommendation', 'Saving', 'Confidence', 'Recurrence risk'].map(h => (
              <span key={h} style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          {recs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              No recommendations for this domain.
            </div>
          ) : (
            recs.map((rec, i) => (
              <div key={rec.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.8fr 0.8fr',
                padding: '11px 16px', fontSize: 12, alignItems: 'center',
                borderBottom: i < recs.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
              }}>
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{rec.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{rec.description}</p>
                </div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {formatCurrency(rec.savingAmount)}<span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>/mo</span>
                </div>
                <div style={{ fontWeight: 500, color: confidenceColor(rec.confidence) }}>
                  {rec.confidence}%
                </div>
                <div style={{ fontSize: 12, color: recurrenceColor(rec.recurrence) }}>
                  {rec.recurrence}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CommandBar />
    </Shell>
  )
}
