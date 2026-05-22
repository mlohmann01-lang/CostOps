import { useState, useEffect } from 'react'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { CONNECTORS } from '../lib/mockData'
import { formatCurrency } from '../lib/formatters'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import type { Domain } from '../types/connector'

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

interface IntelligenceViewProps {
  params?: { domain?: string }
}

interface SpendTrendPoint {
  month: string
  spend: number
}

interface Recommendation {
  id: number
  name: string
  description: string
  domain: string
  savingAmount: number
  confidence: number
  recurrence: string
}

export default function IntelligenceView({ params }: IntelligenceViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const [spendTrend, setSpendTrend] = useState<SpendTrendPoint[]>([])
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIntelligenceData = async () => {
      try {
        const [tRes, rRes] = await Promise.all([
          fetch('/api/analytics/spend-trend'),
          fetch('/api/recommendations/enhanced'),
        ])
        if (!tRes.ok) throw new Error('Failed to fetch spend trend')
        if (!rRes.ok) throw new Error('Failed to fetch recommendations')

        const trend = await tRes.json()
        const recommendations = await rRes.json()

        setSpendTrend(trend)
        setRecs(recommendations)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchIntelligenceData()
  }, [])

  const filteredRecs = domain === 'all' ? recs : recs.filter(r => r.domain === domain)

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
        {error && (
          <div style={{
            padding: '12px 16px', marginBottom: 16,
            background: 'var(--c-red-50)', border: '0.5px solid var(--c-red-200)',
            borderRadius: 8, color: 'var(--c-red-700)', fontSize: 12
          }}>
            Error: {error}
          </div>
        )}
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading intelligence data...
          </div>
        ) : (
          <>
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
                <LineChart data={spendTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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

            {/* Recommendations */}
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recommendations ({filteredRecs.length})
              </span>
            </div>
            <div style={{ background: 'var(--surface-0)', border: '0.5px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.9fr 0.8fr 0.8fr', padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '0.5px solid var(--border-subtle)' }}>
                {['Recommendation', 'Saving', 'Confidence', 'Recurrence risk'].map(h => (
                  <span key={h} style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {filteredRecs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                  No recommendations for this domain.
                </div>
              ) : (
                filteredRecs.map((rec, i) => (
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
          </>
        )}
      </div>

      <CommandBar />
    </Shell>
  )
}
