import React from 'react'
import { getDefaultLandingPage } from '../lib/website/defaultLandingPage'
import { ShieldCheck } from 'lucide-react'

// Public, unauthenticated marketing homepage (Program 9, restyled in Program
// 9A). Unlike every other route registered in App.tsx, this page is
// reachable by anonymous prospects before login, so it intentionally does
// NOT wrap itself in <Shell> (the authenticated control-plane chrome with
// sidebar/nav) and is NOT registered behind RequireRuntime. It renders its
// own minimal page frame, header and footer instead.

const BORDER_DEFAULT = 'var(--border-default, 0.5px solid rgba(255,255,255,0.08))'
const TEAL = 'var(--teal, #1D9E75)'

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-page, #0b0d10)',
  color: 'var(--text-primary, #f5f5f5)',
  fontFamily: 'inherit',
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 1080,
  margin: '0 auto',
  padding: '5rem 2rem',
}

const cardStyle: React.CSSProperties = {
  border: BORDER_DEFAULT,
  borderRadius: 14,
  padding: 20,
  background: 'var(--surface-card, rgba(255,255,255,0.03))',
}

function PrimaryButton({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <a
      href={href ?? '#'}
      style={{
        display: 'inline-block',
        padding: '11px 24px',
        borderRadius: 8,
        border: 'none',
        background: TEAL,
        color: '#06201c',
        fontSize: 15,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textDecoration: 'none',
        lineHeight: 1.4,
      }}
    >
      {children}
    </a>
  )
}

function SecondaryButton({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <a
      href={href ?? '#'}
      style={{
        display: 'inline-block',
        padding: '11px 24px',
        borderRadius: 8,
        border: '0.5px solid rgba(255,255,255,0.25)',
        background: 'transparent',
        color: 'inherit',
        fontSize: 15,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textDecoration: 'none',
        lineHeight: 1.4,
      }}
    >
      {children}
    </a>
  )
}

function Logomark() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 6,
        background: '#1D9E75',
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      C
    </span>
  )
}

function BrandMark({ wordmarkSize = 17 }: { wordmarkSize?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Logomark />
      <span style={{ fontSize: wordmarkSize, fontWeight: 500 }}>Certen</span>
    </span>
  )
}

function PublicHeader({ header }: { header: ReturnType<typeof getDefaultLandingPage>['header'] }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        height: 60,
        borderBottom: BORDER_DEFAULT,
        background: 'var(--bg-page, #0b0d10)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          width: '100%',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <a href="/welcome" style={{ textDecoration: 'none', color: 'inherit' }}>
          <BrandMark />
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {header.navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ fontSize: 14, color: 'var(--text-secondary, #b7bcc4)', textDecoration: 'none' }}
            >
              {link.label}
            </a>
          ))}
          <a
            href={header.signInHref}
            style={{
              fontSize: 14,
              padding: '7px 16px',
              borderRadius: 8,
              border: '0.5px solid rgba(255,255,255,0.25)',
              background: 'transparent',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            {header.signInLabel}
          </a>
          <a
            href={header.getStartedHref}
            style={{
              fontSize: 14,
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: TEAL,
              color: '#06201c',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {header.getStartedLabel}
          </a>
        </nav>
      </div>
    </header>
  )
}

function PublicFooter({ footer }: { footer: ReturnType<typeof getDefaultLandingPage>['footer'] }) {
  return (
    <footer
      style={{
        borderTop: BORDER_DEFAULT,
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <BrandMark />
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #b7bcc4)', marginTop: 8 }}>{footer.caption}</div>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-secondary, #b7bcc4)' }}>
          <a href={footer.signInHref} style={{ color: 'inherit', textDecoration: 'none' }}>
            {footer.signInLabel}
          </a>
          <a href={footer.executiveReviewHref} style={{ color: 'inherit', textDecoration: 'none' }}>
            {footer.executiveReviewLabel}
          </a>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const page = getDefaultLandingPage()
  const {
    header,
    footer,
    hero,
    marketProblem,
    commercialModel,
    economicControlChain,
    questionsByAudience,
    governedAnswers,
    exposureReportSection,
    executiveReview,
  } = page

  return (
    <div style={pageStyle}>
      <PublicHeader header={header} />

      {/* Section 1 — Hero */}
      <section
        style={{
          ...sectionStyle,
          textAlign: 'center',
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(29, 158, 117, 0.08) 0%, transparent 70%)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            background: '#E1F5EE',
            color: '#1D9E75',
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          <ShieldCheck size={13} strokeWidth={2.5} aria-hidden="true" />
          {hero.eyebrow}
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.25, margin: '20px 0 0' }}>
          {hero.headlineLines[0]}
          <br />
          {hero.headlineLines[1]}
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text-secondary, #b7bcc4)', maxWidth: 720, margin: '20px auto 0' }}>
          {hero.subheadline}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
          <PrimaryButton href="#exposure-report">{hero.primaryCta}</PrimaryButton>
          <SecondaryButton href="#economic-control-chain">{hero.secondaryCta}</SecondaryButton>
        </div>
        <div
          style={{
            border: BORDER_DEFAULT,
            borderRadius: 12,
            background: 'var(--surface-card, rgba(255,255,255,0.03))',
            marginTop: 36,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontSize: 12,
            color: 'var(--text-secondary, #b7bcc4)',
          }}
        >
          {hero.trustBanner.map((assurance, idx) => (
            <span
              key={assurance}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderLeft: idx === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.12)',
              }}
            >
              <span style={{ color: TEAL }}>✓</span> {assurance}
            </span>
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            border: BORDER_DEFAULT,
            borderRadius: 12,
            marginTop: 32,
            overflow: 'hidden',
          }}
        >
          {marketProblem.cards.map((card, idx) => (
            <div
              key={card.title}
              style={{
                padding: 24,
                textAlign: 'center',
                borderLeft: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-tertiary, #8a8f99)' }}>
                {card.title}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 10, color: card.valueColor ?? 'inherit' }}>
                {card.value}
              </div>
              <div style={{ fontSize: 13, marginTop: 8, color: 'var(--text-secondary, #b7bcc4)' }}>{card.body}</div>
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
      <section id="economic-control-chain" style={sectionStyle}>
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
      <section id="exposure-report" style={sectionStyle}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: 0 }}>AI & Technology Exposure Report</h2>
        <div
          style={{
            border: BORDER_DEFAULT,
            borderRadius: 12,
            background: 'var(--surface-card, rgba(255,255,255,0.05))',
            marginTop: 32,
            padding: 24,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {exposureReportSection.metrics.map((metric) => (
              <div key={metric.label} style={{ textAlign: 'center' }}>
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
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 32, fontSize: 15 }}>
          {exposureReportSection.flowSteps.map((step) => (
            <div key={step}>{step}</div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
          <PrimaryButton href="#exposure-report">{exposureReportSection.cta}</PrimaryButton>
        </div>
      </section>

      {/* Section 8 — Executive Economic Review */}
      <section style={{ ...sectionStyle, textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{executiveReview.headline}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary, #b7bcc4)', maxWidth: 680, margin: '16px auto 0' }}>
          {executiveReview.supportingCopy}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <PrimaryButton href="#economic-control-chain">{executiveReview.cta}</PrimaryButton>
        </div>
      </section>

      <PublicFooter footer={footer} />
    </div>
  )
}
