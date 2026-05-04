# AI Outcome Control Plane — GovOps

## Overview

Full-stack SaaS platform for enterprise cost optimisation: detect waste → score trust → recommend actions → approve/reject → execute → prove savings. Built as a pnpm monorepo with React+Vite frontend, Express 5 API, and PostgreSQL via Drizzle ORM.

**Core loop:** Detect → Trust Score → Recommend → Approve → Execute → Prove (Savings Ledger)

## Architecture

### Artifacts

| Artifact | Kind | Path | Port | Description |
|---|---|---|---|---|
| `control-plane` | web | `/` | 24565 | React+Vite SPA (dark teal theme) |
| `api-server` | api | `/api` | 8080 | Express 5 REST API |
| `mockup-sandbox` | design | `/__mockup` | 8081 | Canvas/component preview server |

### Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React 18, Vite 7, wouter (routing), shadcn/ui, Recharts, TanStack Query
- **Backend**: Express 5, Drizzle ORM, PostgreSQL
- **Validation**: Zod (zod/v4), drizzle-zod
- **API contract**: OpenAPI spec → Orval codegen (React Query hooks + Zod schemas)
- **Theme**: Dark near-black `hsl(220 20% 6%)` with teal primary `hsl(174 80% 42%)`
- **Node.js**: 24 | **TypeScript**: 5.9

### Library Packages

| Package | Path | Description |
|---|---|---|
| `@workspace/api-spec` | `lib/api-spec` | OpenAPI spec + Orval config |
| `@workspace/api-client-react` | `lib/api-client-react` | Generated React Query hooks |
| `@workspace/api-zod` | `lib/api-zod` | Generated Zod schemas |
| `@workspace/db` | `lib/db` | Drizzle ORM schema + client |

## Database Schema

Three tables in `lib/db/src/schema/`:

- **`connectors`** — data source connections (m365, aws, azure, salesforce, slack, github, zoom, gcp). Fields: `id`, `name`, `type`, `status`, `trustScore`, `recordCount`, `lastSync`.
- **`recommendations`** — AI-generated licence reclaim actions. Fields: `id`, `userEmail`, `displayName`, `licenceSku`, `monthlyCost`, `annualisedCost`, `trustScore`, `executionStatus`, `status`, `playbook`, `connector`, `lastActivity`, `daysSinceActivity`, `rejectionReason`, `createdAt`.
- **`outcomeLedger`** — immutable audit trail of executed savings. Fields: `id`, `recommendationId`, `userEmail`, `displayName`, `licenceSku`, `monthlySaving`, `annualisedSaving`, `executedAt`, `executedBy`, `evidenceRef`, `connector`.

## Frontend Pages

| Page | Route | File |
|---|---|---|
| Command Dashboard | `/` | `src/pages/dashboard.tsx` |
| Recommendations | `/recommendations` | `src/pages/recommendations.tsx` |
| Recommendation Detail | `/recommendations/:id` | `src/pages/recommendation-detail.tsx` |
| Savings Ledger | `/outcomes` | `src/pages/outcomes.tsx` |
| Execution Log | `/execution` | `src/pages/execution-log.tsx` |
| Data Connectors | `/connectors` | `src/pages/connectors.tsx` |

Shared layout sidebar: `src/components/layout.tsx`
Format utilities: `src/lib/format.ts`

## API Routes

All mounted under `/api` prefix:

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | KPI cards data |
| GET | `/api/dashboard/savings-trend` | Monthly savings chart data |
| GET | `/api/dashboard/action-breakdown` | Pie chart data by execution status |
| GET | `/api/connectors` | List all connectors |
| POST | `/api/connectors/:id/sync` | Trigger connector sync |
| GET | `/api/recommendations` | List recommendations (filterable by `status`, `playbook`) |
| POST | `/api/recommendations/generate` | Generate recommendations from mock M365 user data |
| GET | `/api/recommendations/:id` | Get single recommendation |
| POST | `/api/recommendations/:id/approve` | Approve a recommendation |
| POST | `/api/recommendations/:id/reject` | Reject with reason |
| GET | `/api/execution` | List execution events |
| GET | `/api/outcomes` | List savings ledger entries |
| GET | `/api/outcomes/summary` | Total savings summary |

## Key Commands

```bash
# Codegen (after editing lib/api-spec/openapi.yaml)
pnpm --filter @workspace/api-spec run codegen

# DB schema push (dev only)
pnpm --filter @workspace/db run push

# Full typecheck
pnpm run typecheck

# Seed recommendations (via API)
curl -X POST localhost:80/api/recommendations/generate
```

## Seeded Data

- 6 connectors seeded via `lib/db/src/seed.ts`
- 10 mock M365 users used to generate recommendations via `POST /api/recommendations/generate`

## Trust Score Logic

```
trustScore = identityConf×0.4 + freshness×0.3 + signalConf×0.3

identityConf = 0.6 (service/noreply accounts) | 0.9 (normal users)
freshness     = min(daysSinceActivity / 180, 1)
signalConf    = 0.85 (>90 days inactive) | 0.65 (≤90 days)

executionStatus:
  ≥0.90 → AUTO_EXECUTE
  ≥0.75 → APPROVAL_REQUIRED
  ≥0.50 → INVESTIGATE
  <0.50 → BLOCKED
```

## Orval Codegen Notes

- Config: `lib/api-spec/orval.config.ts`
- Zod output does NOT include `schemas` entry (avoids duplicate `RejectRecommendationBody` export)
- `lib/api-zod/src/index.ts` only exports `export * from "./generated/api"` (no `types` re-export)

## Common Pitfalls

- Do not import from `react-icons/si` — not all icons exist (e.g., `SiAmazonwebservices`, `SiMicrosoft`). Use lucide-react for connector icons.
- React Query invalidation: `getListRecommendationsQueryKey()` without params invalidates all recommendation queries.
- Vite dep cache: if icons break, delete `artifacts/control-plane/node_modules/.vite` and restart workflow.
