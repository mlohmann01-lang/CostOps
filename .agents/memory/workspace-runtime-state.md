---
name: WorkspaceRuntimeState pattern
description: Four-state enum introduced to gate synthetic fallbacks in LIVE modes; all test files constructing WorkspaceContext literals must include runtimeState+connectedCount.
---

## The rule
`WorkspaceRuntimeState` = `'DEMO' | 'LIVE_UNCONNECTED' | 'LIVE_DISCOVERING' | 'LIVE_OPERATIONAL'`

Computed in `workspaceContext.tsx` → `deriveWorkspace()`. Never show synthetic/fallback numbers in any state other than DEMO.

## State transitions
- `mode === 'demo'` → DEMO
- `mode === 'live'`, `connectedCount === 0` → LIVE_UNCONNECTED
- `mode === 'live'`, `connectedCount > 0`, `hasOutcomes === false` → LIVE_DISCOVERING
- `mode === 'live'`, `connectedCount > 0`, `hasOutcomes === true` → LIVE_OPERATIONAL

`hasOutcomes` is derived from `GET /api/outcomes/summary` → `totalMonthlySaving > 0`.

## Key files
- `src/types/workspace.ts` — type + DEMO_CONTEXT (includes runtimeState:'DEMO', connectedCount:0)
- `src/lib/workspaceContext.tsx` — deriveWorkspace(), useLiveData(), WorkspaceProvider
- `src/pages/CommandView.tsx` — uses isDemo/isLiveUnconnected/isLiveDiscovering flags; fmtOrDash/fmtOrPending helpers
- `src/pages/ExecutiveValueDashboard.tsx` — isDemo ternary on all five annual() fallbacks; domainRows/opportunityRows/outcomeRows gated
- `src/components/layout/DemoBanner.tsx` — LIVE_OPERATIONAL returns null; others render state-specific banner
- `src/components/layout/TopBar.tsx` — 'Data trust N/A' in LIVE_UNCONNECTED

**Why:** In LIVE mode, showing fallback demo values (320k/120k/80k/64k) constitutes synthetic data leakage that misleads executives into thinking production savings have been identified.

**How to apply:** Any new metric/KPI component that uses `annual()` or a hardcoded fallback MUST gate it behind `isDemo`. Use `'—'` for LIVE_UNCONNECTED, `'Pending'` for LIVE_DISCOVERING.

## Test files that construct WorkspaceContext literals
All must include `runtimeState` and `connectedCount`:
- `src/lib/ui-foundation.test.tsx` — `runtimeState:'DEMO', connectedCount:0`
- `src/lib/live-read-model.test.tsx` — `runtimeState:'DEMO', connectedCount:0`
- `src/lib/live-runtime-events.test.tsx` — three variants with appropriate states
