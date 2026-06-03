import type { ReactNode } from 'react'
import { StatusBadge, type BadgeTone } from './StatusBadge'

type ExecutivePageShellProps = {
  title: string
  subtitle: string
  badgeLabel: string
  badgeTone?: BadgeTone
  children: ReactNode
  rightSlot?: ReactNode
  narrative?: string
}

export function ExecutivePageShell({ title, subtitle, badgeLabel, badgeTone = 'info', children, rightSlot, narrative }: ExecutivePageShellProps) {
  return <main style={{ padding: '28px clamp(18px, 3vw, 34px)', display: 'grid', gap: 18, maxWidth: 1480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
    <section style={{ border: '1px solid rgba(148, 163, 184, .22)', background: 'linear-gradient(135deg, rgba(15,23,42,.96), rgba(15,118,110,.18))', borderRadius: 22, padding: '24px clamp(18px, 3vw, 30px)', boxShadow: '0 24px 80px rgba(0,0,0,.24)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 260, maxWidth: 900 }}>
          <StatusBadge status={badgeLabel} tone={badgeTone} />
          <h1 style={{ margin: '14px 0 10px', fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.04, letterSpacing: '-0.04em' }}>{title}</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6 }}>{subtitle}</p>
        </div>
        {rightSlot && <div>{rightSlot}</div>}
      </div>
      {narrative && <div style={{ marginTop: 18, border: '1px solid rgba(45,212,191,.22)', background: 'rgba(2, 6, 23, .36)', borderRadius: 16, padding: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}><strong style={{ color: 'var(--text-primary)' }}>Executive narrative:</strong> {narrative}</div>}
    </section>
    {children}
  </main>
}
