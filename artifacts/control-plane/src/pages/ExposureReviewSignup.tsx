import React, { useState } from 'react'

const TEAL = 'var(--teal, #1D9E75)'
const BORDER_DEFAULT = 'var(--border-default, 0.5px solid rgba(255,255,255,0.08))'

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.16)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--text-primary, #f5f5f5)',
  outline: 'none',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-tertiary, #8a8f99)',
  display: 'block',
  marginBottom: 5,
}

export default function ExposureReviewSignup() {
  const [form, setForm] = useState({ userEmail: '', fullName: '', company: '', role: '', region: '' })
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const session = {
      userEmail: form.userEmail,
      fullName: form.fullName,
      company: form.company,
      role: form.role || undefined,
      region: form.region || undefined,
      mode: 'DEMO' as const,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem('certen.workspace', JSON.stringify(session))
    localStorage.setItem('certen.workspace.mode', 'DEMO')
    window.location.href = '/exposure-review/workspace'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page, #0b0d10)',
      color: 'var(--text-primary, #f5f5f5)',
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <a href="/welcome" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
          <span style={{ width: 28, height: 28, borderRadius: 6, background: TEAL, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>C</span>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Certen</span>
        </a>

        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 10px', lineHeight: 1.25 }}>Start your Free Exposure Review</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #b7bcc4)', margin: '0 0 28px', lineHeight: 1.65 }}>
          Create a secure Certen workspace to run a read-only Microsoft 365 exposure review. Certen will not modify licences, users, groups or tenant settings.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Work email *</label>
            <input name="userEmail" type="email" required value={form.userEmail} onChange={handleChange} placeholder="you@company.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Full name *</label>
            <input name="fullName" type="text" required value={form.fullName} onChange={handleChange} placeholder="Jane Smith" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Company *</label>
            <input name="company" type="text" required value={form.company} onChange={handleChange} placeholder="Acme Corp" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Role</label>
              <input name="role" type="text" value={form.role} onChange={handleChange} placeholder="CIO / CFO / ITAM" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Region</label>
              <input name="region" type="text" value={form.region} onChange={handleChange} placeholder="UK / US / EU" style={inputStyle} />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 4,
              padding: '12px 0',
              background: submitting ? 'rgba(29,158,117,0.5)' : TEAL,
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              color: '#06201c',
              cursor: submitting ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {submitting ? 'Creating workspace…' : 'Create Review Workspace'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <a href="/welcome#executive-review" style={{ fontSize: 13, color: 'var(--text-secondary, #b7bcc4)', textDecoration: 'none' }}>
            Book Executive Review Instead →
          </a>
        </div>

        <div style={{ marginTop: 28, border: BORDER_DEFAULT, borderRadius: 10, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px 20px', justifyContent: 'center' }}>
          {['Read-only review', 'No licence changes', 'No automated execution', 'Access revocable at any time'].map(t => (
            <span key={t} style={{ fontSize: 11, color: 'var(--text-tertiary, #8a8f99)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: TEAL }}>✓</span> {t}
            </span>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-tertiary, #8a8f99)', textAlign: 'center', marginTop: 22, lineHeight: 1.6 }}>
          Already have access?{' '}
          <a href="/login" style={{ color: TEAL, textDecoration: 'none' }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
