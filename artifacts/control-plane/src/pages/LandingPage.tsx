import React from 'react'
import { getDefaultLandingPage } from '../lib/website/defaultLandingPage'

// Public, unauthenticated marketing homepage (Program 9). Unlike every other
// route registered in App.tsx, this page is reachable by anonymous prospects
// before login, so it intentionally does NOT wrap itself in <Shell> (the
// authenticated control-plane chrome with sidebar/nav) and is NOT registered
// behind RequireRuntime. It renders its own minimal page frame instead.

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-page, #0b0d10)',
  color: 'var(--text-primary, #f5f5f5)',
  fontFamily: 'inherit',
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 1080,
  margin: '0 auto',
  padding: '64px 24px',
}

const cardStyle: React.CSSProperties = {
  border: 'var(--border-default, 1px solid rgba(255,255,255,0.12))',
  borderRadius: 14,
  padding: 20,
  background: 'var(--surface-card, rgba(255,255,255,0.03))',
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      style={{
        padding: '12px 22px',
        borderRadius: 8,
        border: 'none',
        background: 'var(--c-teal-400, #2dd4bf)',
        color: '#06201c',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      style={{
        padding: '12px 22px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.25)',
        background: 'transparent',
        color: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

export default function LandingPage() {
  const page = getDefaultLandingPage()
  const { hero, marketProblem, commercialModel, economicControlChain, questionsByAudience, governedAnswers, exposureReportSection, executiveReview } = page

  return (
    <div style={pageStyle}>
      {/* Section 1 — Hero */}
      <section style={{ ...sectionStyle, textAlign: 'center' }}>
        <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.25, margin: 0 }}>
          {hero.headlineLines[0]}
          <br />
          {hero.headlineLines[1]}
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text-secondary, #b7bcc4)', maxWidth: 720, margin: '20px auto 0' }}>
          {hero.subheadline}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
          <PrimaryButton>{hero.primaryCta}</PrimaryButton>
          <SecondaryButton>{hero.secondaryCta}</SecondaryButton>
        </div>
        <div
          style={{
            ...cardStyle,
            marginTop: 36,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '10px 24px',
            fontSize: 13,
            color: 'var(--text-secondary, #b7bcc4)',
          }}
        >
          {hero.trustBanner.map((assurance) => (
            <span key={assurance}>✓ {assurance}</span>
          ))}
        </div>
      </section>

      {/* Section 2 — Market Problem */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', lineHeight: 1.3, margin: 0 }}>
          {marketProblem.titleLines[0]}
          <br />
          {marketProblem.titleLines[1]}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 32 }}>
          {marketProblem.cards.map((card) => (
            <div key={card.title} style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-tertiary, #8a8f99)' }}>
                {card.title}
              </div>
              <div style={{ fontSize: 15, marginTop: 8 }}>{card.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Uncover / Execute / Protect */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: 0 }}>How Certen works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 32 }}>
          {commercialModel.columns.map((col) => (
            <div key={col.title} style={cardStyle}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{col.title}</div>
              <div style={{ fontSize: 14, marginTop: 8, color: 'var(--text-secondary, #b7bcc4)' }}>{col.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 — Economic Control Chain */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: 0 }}>The Economic Control Chain</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 32 }}>
          {economicControlChain.stages.map((stage, idx) => (
            <div key={stage.key} style={cardStyle}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary, #8a8f99)' }}>{idx + 1}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{stage.title}</div>
              <div style={{ fontSize: 13, marginTop: 8, color: 'var(--text-secondary, #b7bcc4)' }}>{stage.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 — Questions Certen Answers */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: 0 }}>Questions Certen Answers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 32 }}>
          {questionsByAudience.map((group) => (
            <div key={group.audience} style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-tertiary, #8a8f99)' }}>
                {group.audienceLabel}
              </div>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
                {group.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6 — Governed Answers */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 26, fontWeight: 700, textAlign: 'center', lineHeight: 1.3, margin: 0 }}>
          {governedAnswers.headlineLines[0]}
          <br />
          {governedAnswers.headlineLines[1]}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 32 }}>
          {governedAnswers.conceptCallouts.map((concept) => (
            <div key={concept.term} style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{concept.term}</div>
              <div style={{ fontSize: 14, marginTop: 6, color: 'var(--text-secondary, #b7bcc4)' }}>{concept.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7 — AI & Technology Exposure Report */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: 0 }}>AI & Technology Exposure Report</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginTop: 32 }}>
          {exposureReportSection.metrics.map((metric) => (
            <div key={metric.label} style={cardStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-tertiary, #8a8f99)' }}>
                {metric.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{metric.sampleValue}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary, #8a8f99)', textAlign: 'center', marginTop: 14 }}>
          {exposureReportSection.illustrativeNote}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 32, fontSize: 15 }}>
          {exposureReportSection.flowSteps.map((step) => (
            <div key={step}>{step}</div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
          <PrimaryButton>{exposureReportSection.cta}</PrimaryButton>
        </div>
      </section>

      {/* Section 8 — Executive Economic Review */}
      <section style={{ ...sectionStyle, textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{executiveReview.headline}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary, #b7bcc4)', maxWidth: 680, margin: '16px auto 0' }}>
          {executiveReview.supportingCopy}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <PrimaryButton>{executiveReview.cta}</PrimaryButton>
        </div>
      </section>
    </div>
  )
}
