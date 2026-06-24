import React from 'react'
import { getDefaultLandingPage } from '../lib/website/defaultLandingPage'
import { ShieldCheck, Target, Play, CheckCircle, ArrowRight, Shield, Award, Briefcase, Activity, FileSearch, LayoutDashboard } from 'lucide-react'

const BORDER_GOLD = 'var(--border-gold, 0.5px solid rgba(245,196,81,0.35))'
const GOLD = 'var(--accent, #D4A017)'
const GOLD_BRIGHT = 'var(--accent-bright, #F5C451)'
const GOLD_BG = 'var(--accent-soft, rgba(212,160,23,0.14))'

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-page, #050505)',
  color: 'var(--text-primary, #F8F8F5)',
  fontFamily: 'inherit',
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '6rem 2rem',
}

function PrimaryButton({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <a
      href={href ?? '#'}
      style={{
        display: 'inline-block',
        padding: '14px 28px',
        borderRadius: 8,
        border: 'none',
        background: GOLD_BRIGHT,
        color: '#000',
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textDecoration: 'none',
        lineHeight: 1.4,
        boxShadow: '0 4px 14px rgba(212,160,23,0.3)'
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
        padding: '14px 28px',
        borderRadius: 8,
        border: BORDER_GOLD,
        background: GOLD_BG,
        color: GOLD_BRIGHT,
        fontSize: 16,
        fontWeight: 600,
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

function BrandMark({ wordmarkSize = 20 }: { wordmarkSize?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <ShieldCheck size={24} color={GOLD_BRIGHT} />
      <span style={{ fontSize: wordmarkSize, fontWeight: 700, letterSpacing: '1px' }}>CERTEN</span>
    </span>
  )
}

function PublicHeader({ header }: { header: ReturnType<typeof getDefaultLandingPage>['header'] }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 10, height: 72, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center' }}>
      <div style={{ maxWidth: 1280, width: '100%', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/welcome" style={{ textDecoration: 'none', color: 'inherit' }}><BrandMark /></a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {header.navLinks.map((link) => (
            <a key={link.label} href={link.href} style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>{link.label}</a>
          ))}
          <a href={header.signInHref} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>{header.signInLabel}</a>
          <a href={header.getStartedHref} style={{ fontSize: 14, padding: '8px 20px', borderRadius: 8, background: GOLD, color: '#000', fontWeight: 600, textDecoration: 'none' }}>{header.getStartedLabel}</a>
        </nav>
      </div>
    </header>
  )
}

function PublicFooter({ footer }: { footer: ReturnType<typeof getDefaultLandingPage>['footer'] }) {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '4rem 2rem', background: 'var(--surface-0)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <BrandMark />
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12 }}>{footer.caption}</div>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
          <a href={footer.signInHref} style={{ color: 'inherit', textDecoration: 'none' }}>{footer.signInLabel}</a>
          <a href={footer.executiveReviewHref} style={{ color: 'inherit', textDecoration: 'none' }}>{footer.executiveReviewLabel}</a>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const page = getDefaultLandingPage()
  const { header, footer, hero, marketProblem, commercialModel, economicControlChain, questionsByAudience, governedAnswers, exposureReportSection } = page

  return (
    <div style={pageStyle}>
      <PublicHeader header={header} />

      {/* Hero Section */}
      <section style={{ ...sectionStyle, padding: '8rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 24, border: BORDER_GOLD, background: GOLD_BG, color: GOLD_BRIGHT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 24 }}>
              <ShieldCheck size={14} strokeWidth={2.5} /> {hero.eyebrow}
            </div>
            <h1 style={{ fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-1px' }}>
              {hero.headlineLines[0]}<br /><span style={{ color: GOLD_BRIGHT }}>{hero.headlineLines[1]}</span>
            </h1>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 540, margin: '0 0 32px' }}>
              {hero.subheadline}
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <PrimaryButton href="/exposure-review">{hero.primaryCta}</PrimaryButton>
              <SecondaryButton href="/executive-review">{hero.secondaryCta}</SecondaryButton>
            </div>
            <a href="#economic-control-chain" style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: 40, fontWeight: 500 }}>
              {hero.seeHowItWorksLabel}
            </a>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Trusted Guarantees</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {hero.trustBanner.map(assurance => (
                  <span key={assurance} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} color={GOLD} /> {assurance}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface-1)', borderRadius: 24, padding: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -10, left: 32, background: GOLD, color: '#000', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>Preview</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}><LayoutDashboard size={20} color={GOLD} /> Executive Command Center</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
              <div style={{ border: BORDER_GOLD, background: GOLD_BG, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, color: GOLD_BRIGHT, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Potential Annual Value</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#fff' }}>$320,000</div>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'var(--surface-0)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Verified Value</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#fff' }}>$186,000</div>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'var(--surface-0)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Protected Value</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#fff' }}>$174,000</div>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'var(--surface-0)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Finance Verified</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: 'var(--success)' }}>96%</div>
              </div>
            </div>
            
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16, letterSpacing: '1px' }}>Control Chain Status</div>
            <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
              {['Discover', 'Own', 'Analyse', 'Approve', 'Execute', 'Verify', 'Protect'].map((s, i) => (
                <div key={s} style={{ flex: 1, height: 32, borderRadius: 16, background: i < 3 ? 'var(--success-bg)' : i === 3 ? GOLD_BG : 'var(--surface-2)', border: `1px solid ${i < 3 ? 'var(--success)' : i === 3 ? GOLD : 'var(--border-default)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i < 3 ? 'var(--success)' : i === 3 ? GOLD_BRIGHT : 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {s.slice(0,3)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Proof Chain */}
      <section id="exposure-report" style={{ ...sectionStyle, background: 'var(--surface-0)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px' }}>From exposure to verified value</h2>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 720, margin: '0 auto' }}>Certen does not stop at recommendations. Every opportunity is tracked through evidence, approval, execution, finance validation and drift protection.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {[
            { step: 'Identified', value: '$320,000', desc: 'Unused licences & governance exposure' },
            { step: 'Approved', value: '$210,000', desc: 'Converted to governed actions' },
            { step: 'Finance Verified', value: '$186,000', desc: 'Reconciled to finance figures' },
            { step: 'Protected', value: '$174,000', desc: 'Monitored for drift & decay' }
          ].map((item, i) => (
            <React.Fragment key={item.step}>
              <div style={{ flex: 1, minWidth: 200, padding: 32, background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: GOLD_BRIGHT, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>{item.step}</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', marginBottom: 12, letterSpacing: '-1px' }}>{item.value}</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
              {i < 3 && <ArrowRight size={24} color="var(--border-default)" />}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section style={sectionStyle}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px' }}>Start with Microsoft 365. Expand into economic control.</h2>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 720, margin: '0 auto' }}>The free exposure review is the first wedge. Certen connects spend, ownership, usage, risk and verified outcomes across the technology estate.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { icon: Shield, title: 'Microsoft 365', body: 'Unused licences, inactive users, ownership gaps and Copilot exposure.' },
            { icon: Activity, title: 'AI Platforms', body: 'AI assets, models, agents, token spend, shadow AI and outcome attribution.' },
            { icon: Target, title: 'SaaS Applications', body: 'Duplication, under-utilisation, renewal exposure and business ownership.' },
            { icon: Play, title: 'Cloud Platforms', body: 'Spend, rightsizing, idle resources, tagging gaps and optimisation actions.' },
            { icon: Briefcase, title: 'ITAM / Contracts', body: 'Entitlements, renewals, vendor exposure and commercial governance.' },
            { icon: ShieldCheck, title: 'ServiceNow / Workflow', body: 'Governed action execution, approval evidence and operational verification.' },
            { icon: Award, title: 'Finance', body: 'Projected value, realised value, variance and finance reconciliation.' },
            { icon: FileSearch, title: 'Executive Proof Packs', body: 'Board, CFO, CIO, procurement and audit-ready evidence packs.' },
          ].map((cap, i) => (
            <div key={cap.title} style={{ padding: 24, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, background: 'var(--surface-1)' }}>
              <cap.icon size={28} color={GOLD_BRIGHT} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{cap.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cap.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Audience */}
      <section style={{ ...sectionStyle, background: 'var(--surface-0)' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', margin: '0 0 48px' }}>Questions Certen Answers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {questionsByAudience.map((group) => (
            <div key={group.audience} style={{ padding: 32, border: BORDER_GOLD, borderRadius: 20, background: 'var(--surface-1)', boxShadow: '0 8px 24px rgba(212,160,23,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: GOLD_BRIGHT, marginBottom: 20 }}>{group.audienceLabel}</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)' }}>
                {group.questions.map(q => <li key={q} style={{ marginBottom: 12 }}>{q}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Economic Control Chain */}
      <section id="economic-control-chain" style={sectionStyle}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px' }}>The Economic Control Chain</h2>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 720, margin: '0 auto' }}>A systematic, governed pipeline from discovery to protection.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
          {economicControlChain.stages.map((stage, i) => (
            <div key={stage.key} style={{ display: 'flex', gap: 24, padding: 24, background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: GOLD_BG, color: GOLD_BRIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{stage.title}</h3>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{stage.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      
    </div>
  )
}
