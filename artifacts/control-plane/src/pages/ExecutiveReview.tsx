import React, { useState } from 'react'
import {
  PREFERRED_TIMEFRAMES,
  REVIEW_TOPICS,
  EXECUTIVE_REVIEW_EMPTY_FORM,
  EXECUTIVE_REVIEW_SUBMIT_CTA,
  EXECUTIVE_REVIEW_CONFIRMATION_HEADLINE,
  type ExecutiveReviewFormState,
  type ReviewTopic,
} from '../lib/website/exposureReviewJourney'

// Program 10, Part 5 — Executive Review booking experience. Purely
// client-side/local state — no backend submission, no calendar integration.
// Submitting just flips a boolean and shows a confirmation message.

const BORDER_DEFAULT = 'var(--border-default, 0.5px solid rgba(255,255,255,0.08))'
const TEAL = 'var(--teal, #1D9E75)'

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-page, #0b0d10)',
  color: 'var(--text-primary, #f5f5f5)',
  fontFamily: 'inherit',
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '5rem 2rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  background: 'var(--surface-card, rgba(255,255,255,0.03))',
  border: BORDER_DEFAULT,
  borderRadius: 8,
  fontSize: 14,
  color: 'inherit',
  outline: 'none',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-tertiary, #8a8f99)',
  display: 'block',
  marginBottom: 6,
}

export default function ExecutiveReview() {
  const [form, setForm] = useState<ExecutiveReviewFormState>(EXECUTIVE_REVIEW_EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)

  function toggleTopic(topic: ReviewTopic) {
    setForm((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic) ? prev.topics.filter((t) => t !== topic) : [...prev.topics, topic],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div style={pageStyle}>
      <section style={sectionStyle}>
        <a href="/exposure-review/report" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14, fontWeight: 500 }}>
          ← Certen
        </a>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '24px 0 0' }}>Book an Executive Review</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #b7bcc4)', marginTop: 8 }}>
          Tell us a little about your organisation and we will follow up to schedule a review. No calendar booking is
          made here — this is a request.
        </p>

        {submitted ? (
          <div
            style={{
              border: BORDER_DEFAULT,
              borderRadius: 14,
              background: 'var(--surface-card, rgba(255,255,255,0.03))',
              padding: 28,
              marginTop: 28,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: TEAL }}>{EXECUTIVE_REVIEW_CONFIRMATION_HEADLINE}</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary, #b7bcc4)', marginTop: 10 }}>
              Thank you, {form.name || 'there'}. A member of the Certen team will reach out to confirm your Executive
              Review.
            </p>
            <div style={{ marginTop: 20 }}>
              <a
                href="/exposure-review/next-steps"
                style={{
                  display: 'inline-block',
                  padding: '11px 24px',
                  borderRadius: 8,
                  border: '0.5px solid rgba(255,255,255,0.25)',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textDecoration: 'none',
                }}
              >
                See what happens next
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input
                type="text"
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <input
                type="text"
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Preferred Timeframe</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PREFERRED_TIMEFRAMES.map((timeframe) => (
                  <label key={timeframe} style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="preferredTimeframe"
                      value={timeframe}
                      checked={form.preferredTimeframe === timeframe}
                      onChange={() => setForm({ ...form, preferredTimeframe: timeframe })}
                      required
                    />
                    {timeframe}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Review Topics</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {REVIEW_TOPICS.map((topic) => (
                  <label key={topic} style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.topics.includes(topic)}
                      onChange={() => toggleTopic(topic)}
                    />
                    {topic}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              style={{
                marginTop: 6,
                padding: '12px 0',
                background: TEAL,
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
                color: '#06201c',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {EXECUTIVE_REVIEW_SUBMIT_CTA}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
