// PX0 — Demo & Live Operations Readiness routes.
//
// Thin HTTP surface over real, existing services only: demo seed builder,
// live tenant bootstrap, and connector readiness for the named live
// connectors. No new authority, no new governance model.
import { Router } from 'express';
import { buildDemoSeed, DEMO_TENANT_ID } from '../lib/demo-seed/demo-seed-builder';
import { liveTenantBootstrapService } from '../lib/live-tenant-bootstrap/live-tenant-bootstrap-service';
import { liveTenantReadinessService } from '../lib/live-tenant-readiness';
import { connectorReadinessService } from '../lib/connector-readiness/connector-readiness-service';

const r = Router();
const tenant = (req: any) => String(req.tenantId ?? req.header('x-tenant-id') ?? req.query.tenantId ?? 'default-tenant');
const send = (fn: any) => async (req: any, res: any) => {
  try {
    res.json(await fn(req, res));
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? String(e) });
  }
};

r.post('/demo/seed', send((req: any) => buildDemoSeed(req.body?.tenantId ?? DEMO_TENANT_ID)));
r.get('/demo/tenant-id', send(() => ({ tenantId: DEMO_TENANT_ID })));

r.post('/live/bootstrap', send((req: any) => liveTenantBootstrapService.bootstrap({
  tenantName: req.body?.tenantName,
  tenantSlug: req.body?.tenantSlug ?? tenant(req),
  adminEmail: req.body?.adminEmail,
  environment: req.body?.environment ?? 'production',
  actorId: req.body?.actorId ?? 'system',
  requiredDomains: req.body?.requiredDomains,
  primaryUseCase: req.body?.primaryUseCase,
})));

// PX0.11 — New Tenant View: Readiness Score, Next Actions, Missing
// Connectors, First Outcome Readiness — derived entirely from the existing
// Live Tenant Onboarding Authority (liveTenantReadinessService), never a new
// authority.
r.get('/live/new-tenant-view', send(async (req: any) => {
  const t = tenant(req);
  const snapshot = await liveTenantReadinessService.buildReadinessSnapshot(t);
  const connectorSummary = await connectorReadinessService.summariseConnectorReadiness(t);
  return {
    tenantId: t,
    readinessScore: snapshot.readinessScore,
    overallStatus: snapshot.overallStatus,
    nextActions: snapshot.nextSteps,
    missingConnectors: connectorSummary.connectors.filter((c: any) => c.status === 'MISSING' || c.status === 'BLOCKED'),
    firstOutcomeReady: snapshot.economicControlChainReady && snapshot.requiredDataCoverageReady,
  };
}));

// PX0.12 — Connector readiness for the named live connectors. Honest
// mapping onto whatever manifests already exist in the registry; AWS,
// Snowflake and Databricks have no manifest yet and are reported MISSING
// rather than fabricated.
const NAMED_CONNECTORS: Array<{ label: string; connectorKey: string | null }> = [
  { label: 'Microsoft 365', connectorKey: 'm365' },
  { label: 'AWS', connectorKey: null },
  { label: 'ServiceNow', connectorKey: 'servicenow' },
  { label: 'Flexera', connectorKey: 'flexera' },
  { label: 'Snowflake', connectorKey: null },
  { label: 'Databricks', connectorKey: null },
  { label: 'OpenAI', connectorKey: 'ai_provider' },
];

r.get('/live/connector-readiness', send(async (req: any) => {
  const t = tenant(req);
  const summary = await connectorReadinessService.summariseConnectorReadiness(t);
  const byKey = new Map(summary.connectors.map((c: any) => [c.connectorKey, c]));
  return {
    tenantId: t,
    connectors: NAMED_CONNECTORS.map(({ label, connectorKey }) => ({
      label,
      connectorKey,
      status: connectorKey ? (byKey.get(connectorKey)?.status ?? 'MISSING') : 'MISSING',
    })),
  };
}));

export default r;
