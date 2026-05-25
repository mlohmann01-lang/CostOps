# Certen Interaction Inventory

| elementId | label | page | currentBehavior | requiredBehavior | backendEndpoint | demoBehavior | productionBehavior | rbacRequired | tenantModeRequirement | auditEvent |
|---|---|---|---|---|---|---|---|---|---|---|
| connector-test-all | Test all | ConnectorHub | Local state only | Trigger readiness checks and summary | GET /connectors, GET /connectors/:id/readiness | Simulate readiness | Call readiness APIs; report unsupported | operator+ | any | connector.test_all |
| connector-add | Add connector | ConnectorHub | Open modal | Show connector matrix and setup intent | connector-specific auth/readiness routes | Create demo config intent | Start config or show unavailable | operator+ | writable tenant | connector.add_intent |
| connector-manage-sources | Manage sources | ConnectorHub | Open drawer | List/edit evidence sources with support status | (future) PATCH /connectors/:id/sources | Edit demo sources | Read-only if update unsupported | operator+ | any | connector.sources.manage |
| command-approve | Approve | CommandView | no-op | Confirm + approve/queue transition | POST /economic-operations/intent etc. | Simulate queued approval | Real endpoint or explicit unsupported error | approver+ | not read-only | recommendation.approve |
| command-review | Review | CommandView | no-op | Open detail drawer | proof endpoints | Open local proof detail | Fetch live proof; show PROOF_INCOMPLETE | viewer+ | any | recommendation.review |
| execution-now | Execute now | ExecutionView | no-op | Confirm + execute/queue | POST /economic-operations/intent | Demo simulated state | Execute or blocked reason | executor+ | live enabled | execution.request |
| governance-view-row | View | GovernanceView | row static | Open audit detail drawer | governance/audit route | demo details | live details | viewer+ | any | audit.view |
| intelligence-review | Review | IntelligenceView | row static | Open same detail drawer | proof endpoints | local data | live/dynamic data | viewer+ | any | intelligence.review |
| ask-certen-query | Ask Certen beta | App shell | placeholder | Guided suggestions + structured answer | summary endpoints (optional) | use visible data | backend summary if present | viewer+ | any | ask_certen.query |


## P1 Closure Status

| elementId | status | statePersistence | crossPageImpact | testCoverage |
|---|---|---|---|---|
| connector-test-all | wired | demo-session | ConnectorHub, Command badges, Intelligence connector risk | manual: connector test summary + status badges |
| connector-add | wired | demo-session | ConnectorHub, Governance setup intent references | manual: add connector wizard open + setup intent |
| connector-manage-sources | wired | none | ConnectorHub evidence source view | manual: manage sources drawer open/read-only reason |
| command-approve | backend-backed | backend | Command, Execution, Governance audit, Intelligence totals | unit/manual: confirm approval + cross-page refresh |
| command-review | backend-backed | backend | Command, Intelligence row detail, Governance references | unit/manual: detail drawer row-specific proof |
| execution-now | backend-backed | backend | Execution queue, Governance audit, Command totals | manual: execute transitions or blocked reason |
| governance-view-row | wired | backend | Governance audit list + row detail | manual: audit detail drawer opens |
| intelligence-review | wired | backend | Intelligence and Command shared recommendation detail | manual: intelligence row review opens |
| ask-certen-query | wired | demo-session | App shell deep links to Command/Execution/ConnectorHub | manual: guided query response + deep link |
