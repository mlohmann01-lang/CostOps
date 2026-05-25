# P1 Interaction Smoke Test

- [ ] Test All updates connector status summary and per-card readiness.
- [ ] Add Connector opens wizard/modal and records setup intent state.
- [ ] Manage Sources opens source drawer with trust/freshness/synthetic/live labels.
- [ ] Reconfigure from degraded connector opens remediation path.
- [ ] Approve opens confirmation and shows demo/production outcome label.
- [ ] Review opens row-specific operational detail/proof context.
- [ ] Proof expansion is row-specific (no first-row static leakage).
- [ ] Execute Now opens confirmation and transitions to demo simulated or blocked.
- [ ] Schedule opens modal and records demo schedule or production unsupported state.
- [ ] Governance audit row opens audit detail drawer.
- [ ] Intelligence has at least one chart plus confidence/recurrence explanations.
- [ ] Ask Certen beta shows guided suggestions and structured response.
- [ ] Sync Jobs route renders non-empty operational status view.
- [ ] Audit Log route renders investigable audit rows.
- [ ] Settings route renders read-only tenant/runtime/RBAC details.
- [ ] RBAC-disabled states show visible reason on CTA tooltips/messages.
- [ ] Demo actions explicitly include no-production-change labels.
- [ ] Approval emits cross-page lifecycle effects (Execution queue, Governance audit, Intelligence funnel, Ask Certen summary).
- [ ] Execution emits started/completed/verification events and updates runtime summary in Ask Certen.
- [ ] Connector readiness transitions emit tested/degraded/ready/unavailable and refresh blocker/freshness surfaces.
- [ ] Intelligence funnel and spend trend react after approval/execution interactions.
- [ ] Recommendation detail timeline includes operational states and demo/live distinction.

## P2 Product Surface Checks
- [ ] Landing page (`/`) shows enterprise narrative + CTA pathing.
- [ ] Login supports Sign In + Launch Demo Workspace with error/loading states.
- [ ] Demo workspace banner clearly indicates synthetic/no production connections.
- [ ] Demo workspace guide appears (demo only) and is dismissible.
- [ ] Connector setup wizard opens from Add Connector and Reconfigure flows.
- [ ] Recommendation detail drawer opens from every Review action.
- [ ] Intelligence shows trend, funnel, projected vs verified, and domain breakdown.
- [ ] Empty/loading/error states include what happened, why, and next step.
- [ ] Tenant/runtime banner shows tenant, role, environment, mode, execution status.
- [ ] Logout clears session and returns to login flow.
