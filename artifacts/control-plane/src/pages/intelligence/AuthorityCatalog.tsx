import React, { useMemo, useState } from 'react'
import { Shell } from '../../components/layout/Shell'
import { StatusChip, type StatusChipTone } from '../../components/executive/StatusChip'
import { formatCurrency } from '../../lib/display/formatters'
import { defaultAuthorities, type AuthorityCatalogEntry } from '../../lib/authorityCatalog/defaultAuthorities'

const CATEGORY_OPTIONS: { label: string; value: AuthorityCatalogEntry['category'] | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Technology', value: 'TECHNOLOGY' },
  { label: 'AI', value: 'AI' },
  { label: 'Cloud', value: 'CLOUD' },
  { label: 'ITAM', value: 'ITAM' },
  { label: 'Workflow', value: 'WORKFLOW' },
  { label: 'Finance', value: 'FINANCE' },
]

const STATUS_TONE: Record<AuthorityCatalogEntry['status'], StatusChipTone> = {
  ACTIVE: 'success',
  AVAILABLE: 'info',
  PREVIEW: 'warning',
  PLANNED: 'neutral',
  BLOCKED: 'danger',
}

function Capability({ label, supported }: { label: string; supported: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: supported ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
      <span style={{ display: 'inline-flex', width: 14, height: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid', borderColor: supported ? 'rgba(34,197,94,.4)' : 'rgba(148,163,184,.2)', color: supported ? 'var(--green)' : 'transparent', fontSize: 10, fontWeight: 800 }}>
        {supported ? '✓' : ''}
      </span>
      <span>{label}</span>
    </div>
  )
}

function AuthorityCard({ authority }: { authority: AuthorityCatalogEntry }) {
  const hasValue = authority.opportunityCount !== undefined || authority.projectedAnnualValue !== undefined
  return (
    <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{authority.name}</h3>
        <StatusChip label={authority.status} tone={STATUS_TONE[authority.status]} />
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{authority.description}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Capability label="Discovery" supported={authority.discoverySupported} />
        <Capability label="Execution" supported={authority.executionSupported} />
        <Capability label="Verification" supported={authority.verificationSupported} />
        <Capability label="Protection" supported={authority.protectionSupported} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {authority.connectors.map((connector) => (
          <span key={connector} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 999, border: 'var(--border-default)', color: 'var(--text-secondary)' }}>
            {connector}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        {hasValue ? (
          <span>
            {authority.opportunityCount !== undefined ? `${authority.opportunityCount} opportunities` : ''}
            {authority.opportunityCount !== undefined && authority.projectedAnnualValue !== undefined ? ' · ' : ''}
            {authority.projectedAnnualValue !== undefined ? `${formatCurrency(authority.projectedAnnualValue)} annual value` : ''}
          </span>
        ) : (
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>Available after discovery</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8, borderTop: 'var(--border-default)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: authority.certified ? 'var(--green)' : 'var(--text-tertiary)' }}>
          {authority.certified ? 'Certified' : 'Available'}
        </span>
        <button
          type="button"
          disabled
          style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 9, border: 'var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'default' }}
        >
          {authority.nextAction}
        </button>
      </div>
    </div>
  )
}

export default function AuthorityCatalog() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<AuthorityCatalogEntry['category'] | 'ALL'>('ALL')

  const metrics = useMemo(() => {
    const total = defaultAuthorities.length
    const active = defaultAuthorities.filter((authority) => authority.status === 'ACTIVE').length
    const readyToConnect = total - active
    const projectedTotal = defaultAuthorities.reduce((sum, authority) => sum + (authority.projectedAnnualValue ?? 0), 0)
    return { total, active, readyToConnect, projectedTotal }
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return defaultAuthorities.filter((authority) => {
      const matchesCategory = category === 'ALL' || authority.category === category
      const matchesSearch =
        query.length === 0 ||
        authority.name.toLowerCase().includes(query) ||
        authority.description.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [search, category])

  return (
    <Shell><div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Authority Catalog</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          Discover what Certen can identify, govern, execute, verify and protect across your technology estate.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard label="Authorities Available" value={String(metrics.total)} />
        <MetricCard label="Active Authorities" value={String(metrics.active)} />
        <MetricCard label="Ready To Connect" value={String(metrics.readyToConnect)} />
        <MetricCard label="Projected Opportunity" value={metrics.projectedTotal > 0 ? formatCurrency(metrics.projectedTotal) : 'Available after discovery'} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search authorities"
          style={{ flex: '1 1 240px', padding: '9px 12px', borderRadius: 9, border: 'var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: 13 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORY_OPTIONS.map((option) => {
            const active = option.value === category
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: active ? 'rgba(45,212,191,.4)' : 'var(--border-default)',
                  background: active ? 'rgba(45,212,191,.1)' : 'transparent',
                  color: active ? 'var(--teal)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', border: 'var(--border-default)', borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Authorities are available before connection.</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Connect sources to discover opportunities and estimated value.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((authority) => (
            <AuthorityCard key={authority.id} authority={authority} />
          ))}
        </div>
      )}
    </div></Shell>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: 'var(--border-default)', borderRadius: 14, padding: 16, background: 'var(--surface-card)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  )
}
