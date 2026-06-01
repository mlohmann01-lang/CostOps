import type { Connector } from '../connector-types'
import { acquireM365AccessToken } from './m365-auth'
import { m365DiscoveryService } from './m365-discovery-service'
import { m365HealthService } from './m365-health'
import { checkM365Readiness } from './m365-readiness'
import { m365TrustService } from './m365-trust'

export function buildM365Connector(tenantId: string): Connector {
  return {
    connectorId: 'm365',
    platform: 'M365',
    capabilities: { read: true, dryRun: true, execute: false, verify: true },
    async authenticate() { const token = await acquireM365AccessToken(); return { connectorId: 'm365', tenantId, authenticated: Boolean(token.accessToken), state: token.accessToken ? 'READY' : 'TOKEN_FAILED', requestId: token.requestId, error: token.error } },
    async readiness() { const r = await checkM365Readiness({ tenantId }); return { connectorId: 'm365', tenantId, state: r.authState, readReady: r.readReady, writeReady: r.writeReady, blockers: r.blockers, warnings: r.warnings, checkedAt: r.checkedAt } },
    async health() { const h = await m365HealthService.getHealth(tenantId); return { connectorId: 'm365', tenantId, state: h.state, dimensions: h.dimensions, warnings: h.warnings, blockers: h.blockers, checkedAt: h.checkedAt } },
    async discover() { const d = await m365DiscoveryService.discover({ tenantId }); return { connectorId: 'm365', tenantId, status: d.status, counts: d.counts, warnings: d.warnings, blockers: d.blockers, startedAt: d.startedAt, completedAt: d.completedAt } },
    async trust() { const t = await m365TrustService.generateTrustReport(tenantId); return { connectorId: 'm365', tenantId, globalTrustScore: t.globalTrustScore, globalTrustBand: t.globalTrustBand, generatedAt: t.generatedAt } },
  }
}
