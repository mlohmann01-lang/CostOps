import { WorkspaceModeBanner } from './WorkspaceModeBanner'
export function DemoModeBanner({ mode }: { mode?: 'demo'|'live'|string }) {
  return <WorkspaceModeBanner mode={mode === 'live' ? 'PRODUCTION' : 'DEMO'} />
}
