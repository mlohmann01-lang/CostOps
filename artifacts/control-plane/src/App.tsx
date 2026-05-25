import { useState } from 'react'
import { Switch, Route, Router as WouterRouter, Redirect, useLocation, Link } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ConnectorHub from './pages/ConnectorHub'
import CommandView from './pages/CommandView'
import GovernanceView from './pages/GovernanceView'
import ExecutionView from './pages/ExecutionView'
import IntelligenceView from './pages/IntelligenceView'
import SyncJobsPage from './pages/SyncJobsPage'
import AuditLogPage from './pages/AuditLogPage'
import SettingsPage from './pages/SettingsPage'
import { AuthProvider, useAuth } from './lib/auth/auth-provider'
import { ProtectedRoute } from './lib/auth/protected-route'
import { getSessionStatus, validateCredentials } from './lib/auth/session'
import { TenantProvider } from './lib/tenant/tenant-context'
import { ExecutiveNarrativeOverlay } from './components/layout/ExecutiveNarrativeOverlay'
import { updateDemoSession, useDemoSession } from './lib/operations/demo-session'
import { useRealityEngine } from './lib/runtime/reality-engine'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

function LandingPage() {
  return <div style={{minHeight:'100vh',background:'var(--surface-1)',color:'var(--text-primary)',padding:'40px 28px'}}>
    <h1 style={{fontSize:32,fontWeight:600,maxWidth:780}}>Governed Economic Operations for AI, SaaS, Cloud & IT.</h1>
    <p style={{maxWidth:840,color:'var(--text-secondary)'}}>Certen identifies, governs, verifies, and operationalizes cost optimization opportunities across enterprise technology environments.</p>
    <div style={{display:'flex',gap:10,margin:'14px 0 24px'}}><Link href='/request-access'><button>Request Access</button></Link><Link href='/login'><button>Launch Demo Workspace</button></Link><Link href='/onboarding'><button>View Platform Overview</button></Link></div>
    <p>Connect → Analyze → Govern → Execute → Verify → Prevent Drift</p>
    <p style={{marginTop:18}}>Domains: AI · SaaS · Cloud · Data · M365 · Governance</p>
    <p style={{marginTop:18,color:'var(--text-secondary)'}}>Interactive demo workspace · No production systems connected · Synthetic evidence only</p>
    <footer style={{marginTop:30,fontSize:12,color:'var(--text-tertiary)'}}>Environment: Demo-ready runtime · Security: governed access controls enabled · Contact: request access</footer>
  </div>
}

function LoginPage() {
  const [, setLoc] = useLocation(); const { loginDemo, loading, refresh } = useAuth()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const sessionStatus = getSessionStatus()
  async function submit(e: React.FormEvent) { e.preventDefault(); setError(''); if (!validateCredentials(email, password)) { setError('Invalid credentials.'); return } await loginDemo(email.trim().toLowerCase()); refresh(); setLoc('/app/command') }
  return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'var(--surface-1)'}}><form onSubmit={submit} style={{width:380,background:'var(--surface-0)',padding:24,border:'0.5px solid var(--border-subtle)',borderRadius:12}}>
    <h2>Sign in</h2>{sessionStatus==='expired' && <p style={{fontSize:12,color:'var(--c-amber-600)'}}>Session expired. Please sign in again.</p>}
    <input value={email} onChange={e=>setEmail(e.target.value)} placeholder='Email' style={{width:'100%',marginBottom:8}} />
    <input type='password' value={password} onChange={e=>setPassword(e.target.value)} placeholder='Password' style={{width:'100%',marginBottom:8}} />
    {error && <p style={{fontSize:12,color:'var(--c-red-600)'}}>{error}</p>}
    <button disabled={loading} type='submit'>{loading ? 'Signing in…' : 'Sign In'}</button>
    <button type='button' onClick={async()=>{setError(''); await loginDemo('demo@certen.io'); setLoc('/app/command')}} style={{marginLeft:8}}>{loading ? 'Demo workspace loading…' : 'Launch Demo Workspace'}</button>
    <p style={{fontSize:11,color:'var(--text-tertiary)',marginTop:10}}>Demo credentials are provisioned via access policy.</p>
  </form></div>
}

const SimplePage = ({title, children}:{title:string, children:React.ReactNode}) => <div style={{padding:24}}><h1>{title}</h1>{children}</div>

function AppRuntime() {
  const { session, logout } = useAuth()
  const demo = useDemoSession()
  useRealityEngine()
  if (!session) return <Redirect to='/login?reason=unauthorized' />
  return <TenantProvider><div style={{borderBottom:'0.5px solid var(--border-subtle)',padding:'8px 14px',fontSize:12,background:'var(--surface-0)'}}>
    {session.tenantName} • {session.role} • {session.environment} • {session.tenantMode} • {session.liveExecutionEnabled ? 'Live execution enabled' : 'Live execution disabled'}
    {session.isDemo && <span style={{marginLeft:10,color:'var(--c-amber-600)'}}>Demo workspace • Synthetic evidence • No production systems connected • Governed execution simulated safely</span>}
    {session.isDemo && <button onClick={() => updateDemoSession({ viewMode: demo.viewMode === 'executive' ? 'operational' : 'executive' })} style={{marginLeft:10,fontSize:11}}>{demo.viewMode === 'executive' ? 'Operational view' : 'Executive view'}</button>}
    <button onClick={logout} style={{float:'right'}}>Logout</button>
  </div>
  {session.isDemo && <ExecutiveNarrativeOverlay />}
  <Switch>
      <Route path='/app/connectors' component={() => <ConnectorHub />} />
      <Route path='/app/command' component={() => <CommandView params={{domain:'all'}} />} />
      <Route path='/app/governance' component={() => <GovernanceView params={{domain:'all'}} />} />
      <Route path='/app/execution' component={() => <ExecutionView params={{domain:'all'}} />} />
      <Route path='/app/intelligence' component={() => <IntelligenceView params={{domain:'all'}} />} />
      <Route path='/app/sync-jobs' component={() => <SyncJobsPage />} />
      <Route path='/app/audit-log' component={() => <AuditLogPage />} />
      <Route path='/app/settings' component={() => <SettingsPage />} />
      <Route component={() => <Redirect to='/app/command' />} />
    </Switch></TenantProvider>
}

function Router() {
  return <Switch>
    <Route path='/' component={LandingPage} />
    <Route path='/login' component={LoginPage} />
    <Route path='/request-access' component={() => <SimplePage title='Request Access'><p>Access request submitted. A Certen operator will review your workspace request.</p></SimplePage>} />
    <Route path='/onboarding' component={() => <SimplePage title='Onboarding'><p>Welcome → Workspace mode → Connector interests → Governance preferences → Launch workspace.</p><p>Production onboarding requires access review and setup.</p></SimplePage>} />
    <Route path='/app/:rest*' component={() => <ProtectedRoute><AppRuntime /></ProtectedRoute>} />
    <Route component={() => <Redirect to='/' />} />
  </Switch>
}

export default function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></AuthProvider></QueryClientProvider>
}
