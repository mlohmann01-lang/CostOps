import { Link } from 'wouter'

const problemCards = [
  {
    title: 'Recommendations stall',
    copy: 'Savings ideas sit in dashboards, spreadsheets, or tickets without clear ownership.',
  },
  {
    title: 'Execution is risky',
    copy: 'Teams hesitate to remove licences, change routes, or shut down resources without proof and rollback confidence.',
  },
  {
    title: 'Drift comes back',
    copy: 'Even when savings are achieved, costs return when governance, verification, and monitoring are missing.',
  },
]

const flowSteps = [
  'Connect evidence',
  'Detect opportunity',
  'Simulate action',
  'Govern approval',
  'Execute safely',
  'Verify savings',
  'Monitor drift',
]

const pillars = [
  {
    title: 'AI Economic Governance',
    copy: 'Control token spend, model routing, AI vendor overlap, and runtime drift.',
  },
  {
    title: 'SaaS & Licence Operations',
    copy: 'Find reclaim, rightsizing, overlap, and underuse opportunities across M365 and SaaS.',
  },
  {
    title: 'Cloud & Data Cost Actions',
    copy: 'Govern savings opportunities across cloud, warehouse, and data platforms.',
  },
  {
    title: 'Proof, Drift & Verification',
    copy: 'Track every recommendation from evidence to verified outcome with audit-ready proof.',
  },
]

const trustItems = [
  'Tenant-aware runtime',
  'Role-based approvals',
  'Proof lineage',
  'Readiness gates',
  'Rollback visibility',
  'Drift monitoring',
  'Demo/live separation',
]

const sectionStyle = {
  width: 'min(1120px, 100%)',
  margin: '0 auto',
  padding: '84px 20px',
} as const

export default function LandingPage() {
  return (
    <div style={{ background: 'radial-gradient(circle at 20% 0%, #123530 0%, #070d14 38%, #05070c 100%)', color: '#e6eef7', minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(8px)', background: 'rgba(5,10,16,0.86)', borderBottom: '1px solid rgba(121,149,184,0.2)' }}>
        <div style={{ ...sectionStyle, paddingTop: 14, paddingBottom: 14, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <a href='/' style={{ textDecoration: 'none', color: '#eaf6ff', fontWeight: 700, fontSize: 20 }}>Certen</a>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', fontSize: 14 }}>
            <a href='#product' style={{ color: '#c3d4ea' }}>Product</a>
            <a href='#use-cases' style={{ color: '#c3d4ea' }}>Use cases</a>
            <a href='#security' style={{ color: '#c3d4ea' }}>Security</a>
            <a href='#demo' style={{ color: '#c3d4ea' }}>Demo</a>
            <Link href='/login'><a style={{ color: '#d9f2ec', fontWeight: 600 }}>Sign in</a></Link>
            <Link href='/request-access'><a style={{ padding: '10px 14px', background: '#28b8a4', color: '#05221d', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Request access</a></Link>
          </nav>
        </div>
      </header>

      <main>
        <section style={sectionStyle}>
          <p style={{ color: '#86e8d9', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>AI Economic Operations Infrastructure</p>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 1.08, maxWidth: 840, margin: '10px 0 14px' }}>Govern AI and software spend from recommendation to verified outcome.</h1>
          <p style={{ color: '#b9cbe2', maxWidth: 880, fontSize: 18 }}>Certen helps enterprises detect avoidable AI, SaaS, cloud, and IT spend — then govern execution, prove outcomes, and prevent drift from returning.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <Link href='/onboarding'><a style={{ background: '#36d5bf', color: '#07312a', textDecoration: 'none', padding: '12px 18px', borderRadius: 10, fontWeight: 700 }}>Launch demo workspace</a></Link>
            <Link href='/request-access'><a style={{ border: '1px solid #3f596f', color: '#e6eef7', textDecoration: 'none', padding: '12px 18px', borderRadius: 10, fontWeight: 600 }}>Request access</a></Link>
            <Link href='/login'><a style={{ color: '#8ce8da', textDecoration: 'none', padding: '12px 6px', fontWeight: 600 }}>Sign in</a></Link>
          </div>
          <p style={{ marginTop: 16, color: '#9cb0c7', fontSize: 13 }}>Demo workspace uses synthetic evidence. No production systems connected. Live execution disabled.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ fontSize: 34 }}>Visibility does not create savings.</h2>
          <p style={{ color: '#b8cbe2', maxWidth: 900 }}>Most cost tools identify waste. The hard part is turning recommendations into safe, approved, verified action — without breaking ownership, controls, or trust.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 22 }}>
            {problemCards.map((card) => (
              <article key={card.title} style={{ background: 'rgba(7,18,30,0.9)', border: '1px solid rgba(80,120,146,0.35)', borderRadius: 12, padding: 18 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>{card.title}</h3>
                <p style={{ margin: 0, color: '#adc1d8' }}>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id='product' style={sectionStyle}>
          <h2 style={{ fontSize: 34 }}>Certen operationalizes savings.</h2>
          <p style={{ color: '#b8cbe2' }}>One governed workflow from evidence to outcome.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginTop: 20 }}>
            {flowSteps.map((step) => <div key={step} style={{ borderRadius: 999, border: '1px solid rgba(81,141,151,0.55)', padding: '10px 14px', color: '#d5eaf2', background: 'rgba(11,31,41,0.85)', textAlign: 'center', fontWeight: 600 }}>{step}</div>)}
          </div>
        </section>

        <section id='use-cases' style={sectionStyle}>
          <h2 style={{ fontSize: 34 }}>Not another dashboard. A governed action system.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <article style={{ background: 'rgba(7,18,30,0.9)', border: '1px solid rgba(80,120,146,0.35)', borderRadius: 12, padding: 18 }}><h3>Traditional cost tools</h3><ul><li>surface savings</li><li>export reports</li><li>rely on manual follow-up</li><li>limited proof of realization</li><li>drift is handled after the fact</li></ul></article>
            <article style={{ background: 'rgba(6,31,30,0.85)', border: '1px solid rgba(71,180,158,0.5)', borderRadius: 12, padding: 18 }}><h3>Certen</h3><ul><li>validates evidence</li><li>governs readiness and approval</li><li>tracks execution lifecycle</li><li>verifies realized savings</li><li>monitors drift and rollback risk</li></ul></article>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ fontSize: 34 }}>Product pillars</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
            {pillars.map((pillar) => <article key={pillar.title} style={{ background: 'rgba(7,18,30,0.9)', border: '1px solid rgba(80,120,146,0.35)', borderRadius: 12, padding: 18 }}><h3 style={{ marginTop: 0 }}>{pillar.title}</h3><p style={{ marginBottom: 0, color: '#adc1d8' }}>{pillar.copy}</p></article>)}
          </div>
        </section>

        <section id='security' style={sectionStyle}>
          <h2 style={{ fontSize: 34 }}>Built for governed enterprise action.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {trustItems.map((item) => <div key={item} style={{ borderRadius: 10, border: '1px solid rgba(80,120,146,0.35)', padding: '12px 14px', background: 'rgba(7,18,30,0.85)' }}>{item}</div>)}
          </div>
        </section>

        <section id='demo' style={sectionStyle}>
          <h2 style={{ fontSize: 34 }}>Explore the synthetic demo workspace.</h2>
          <p style={{ color: '#b8cbe2', maxWidth: 860 }}>Walk through AI token governance, M365 reclaim, connector degradation, and Flexera authority scenarios without connecting production systems.</p>
          <Link href='/onboarding'><a style={{ display: 'inline-block', marginTop: 12, background: '#36d5bf', color: '#07312a', textDecoration: 'none', padding: '12px 18px', borderRadius: 10, fontWeight: 700 }}>Launch demo workspace</a></Link>
          <p style={{ color: '#9cb0c7', fontSize: 13, marginTop: 12 }}>Synthetic evidence only. No production systems connected. Live execution disabled.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ fontSize: 34 }}>Preparing for pilot environments.</h2>
          <p style={{ color: '#b8cbe2', maxWidth: 860 }}>Certen is designed for teams that need to move from cost visibility to governed economic operations. Request access to discuss a controlled read-only pilot.</p>
          <Link href='/request-access'><a style={{ display: 'inline-block', marginTop: 12, border: '1px solid #3f596f', color: '#e6eef7', textDecoration: 'none', padding: '12px 18px', borderRadius: 10, fontWeight: 600 }}>Request access</a></Link>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid rgba(121,149,184,0.2)' }}>
        <div style={{ ...sectionStyle, paddingTop: 28, paddingBottom: 38, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          <div><strong>Certen</strong><p style={{ marginTop: 8, color: '#9eb2ca' }}>AI Economic Operations</p></div>
          <nav style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href='#product' style={{ color: '#c3d4ea' }}>Product</a>
            <a href='#demo' style={{ color: '#c3d4ea' }}>Demo</a>
            <a href='#security' style={{ color: '#c3d4ea' }}>Security</a>
            <Link href='/request-access'><a style={{ color: '#c3d4ea' }}>Request Access</a></Link>
            <Link href='/login'><a style={{ color: '#c3d4ea' }}>Sign In</a></Link>
          </nav>
        </div>
        <p style={{ margin: 0, padding: '0 20px 28px', color: '#8094ac', fontSize: 12, textAlign: 'center' }}>Demo environments use synthetic data unless explicitly connected to a live tenant.</p>
      </footer>
    </div>
  )
}
