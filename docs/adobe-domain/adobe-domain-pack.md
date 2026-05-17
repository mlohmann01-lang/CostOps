# Adobe Domain Pack — Operational Governance & Spend Control Layer

## Strategic Positioning

The Adobe pack extends the canonical runtime governance spine as a **domain pack**, not a standalone architecture. It is positioned as an **Adobe Commercial Governance + Operational Control Layer** that attaches to Adobe, Flexera, ServiceNow, and enterprise identity systems without competing with any of them.

### Non-goals
- Adobe admin console replacement
- Adobe discovery tool replacement
- SAM replacement
- SaaS management replacement

## Canonical Runtime Reuse Contract

Adobe implementation MUST reuse existing platform authorities:
- Evidence normalization authority
- Trust scoring authority
- Reconciliation authority
- Recommendation lifecycle authority
- Governance policy authority
- Arbitration authority
- Workflow orchestration authority
- Simulation authority
- Outcome intelligence authority
- Replay authority
- Telemetry authority

Adobe MUST NOT introduce:
- Adobe-specific orchestration engine
- Adobe-specific workflow engine
- Adobe-specific replay subsystem
- Adobe-specific telemetry subsystem

## Core Problem Areas (Adobe)

1. Inactive or underused high-cost creative licenses
2. Contractor and freelancer identity drift
3. SKU tier mismatch and over-entitlement
4. Shared-device / lab / kiosk ambiguity
5. Add-on sprawl with poor attribution
6. Duplicate identity and orphaned account chains
7. Renewal exposure and true-up shock risk

## Domain Layers

### 1) Evidence Layer
Required sources:
- Adobe Admin Console: users, products, assignments, usage, identity type, groups, storage, admin roles, sign-ins, inactive dates, contract dates
- Flexera / ITAM: entitlements, purchases, renewals, cost basis, true-up history
- ServiceNow: ownership, cost center, manager chain, contractor status, offboarding evidence
- Identity providers (Entra ID, Okta, Google Workspace): active state, termination state, contractor state, identity confidence

### 2) Trust Layer
Reuse canonical trust dimensions with Adobe mappings:
- Identity confidence: federated vs Adobe ID ambiguity, duplicate likelihood, contractor uncertainty, shared-device ambiguity
- Usage confidence: recent usage, partial usage, sign-in only, sync-only, storage-only activity
- Entitlement confidence: purchase alignment, assignment validity, overlap certainty
- Governance confidence: admin role, executive flag, legal hold, creative leadership exemption, project exception

### 3) Reconciliation Layer
Required reconciliation categories:
- Duplicate identity
- Entitlement conflict
- Usage conflict
- Cost attribution conflict
- Contractor drift
- Renewal exposure

### 4) Lifecycle Layer
Adobe recommendations must use canonical lifecycle states:
- `GENERATED`
- `NEEDS_EVIDENCE`
- `NEEDS_TRUST_REVIEW`
- `GOVERNANCE_REVIEW_REQUIRED`
- `READY_FOR_REVIEW`
- `WORKFLOW_REVIEW`
- `ARBITRATED`
- `SIMULATED`
- `OUTCOME_PENDING`
- `OUTCOME_RESOLVED`
- `SUPPRESSED`

### 5) Governance Layer
Adobe governance policies (domain rules over canonical engine):
- Protected creative/executive roles
- Shared-device guardrails (`REQUIRE_APPROVAL`)
- Contractor inactivity reclaim candidacy
- Adobe admin escalation
- Project-based temporary exceptions

### 6) Arbitration Layer
Required arbitration precedence examples:
- Full reclaim recommendation suppresses downgrade for same entity/SKU conflict
- Duplicate SKU elimination suppresses lower-value rightsize
- Governance blockers (legal/project/admin) suppress action

### 7) Workflow Layer
Workflow types:
- Inactive License Review
- Contractor Review
- Shared Device Review
- Creative Leadership Approval
- Renewal Readiness Review
- Storage Governance Review
- Add-On Reallocation Review
- Duplicate Identity Review

### 8) Simulation Layer
Simulation types:
- Renewal Exposure
- Rightsize Impact
- Storage Reduction
- Contractor Cleanup
- Add-On Rationalization
- Shared Device Governance

### 9) Outcome Intelligence Layer
Required metrics:
- Realized Savings
- Savings Confidence
- Reversal Rate
- Drift Rate
- Governance Override Rate
- Rightsize Success Rate
- Contractor Reclaim Success
- Renewal Shock Avoidance

## Adobe Playbook Pack (Sequential)

1. **Inactive Adobe License Reclaim**  
   Detect assigned + inactive threshold; exclude admins/executives/shared devices/protected creatives; route through workflow/simulation/outcomes.
2. **Adobe SKU Rightsizing**  
   e.g., All Apps → Single App, Acrobat Pro → Reader baseline where evidence supports.
3. **Contractor / Freelancer Cleanup**  
   Cross-reference HRIS, identity, Adobe assignment, and ServiceNow offboarding state.
4. **Add-On Rationalization**  
   Stock, Firefly credits, Frame.io, Substance, Sign, storage add-ons.
5. **Duplicate Identity Resolution**  
   Adobe ID/federated collisions and orphaned identities.
6. **Storage Governance**  
   Inactive storage owners, storage growth anomalies, orphaned asset ownership.
7. **Adobe Renewal Readiness Pack**  
   Consolidated executive governance view across inactive use, rightsizing, add-ons, storage, identity duplication, contractor drift, blockers, and exposure.

## Telemetry and Replay Requirements

Adobe must emit events through canonical telemetry authority, including:
- `ADOBE_RECOMMENDATION_GENERATED`
- `ADOBE_RECOMMENDATION_SUPPRESSED`
- `ADOBE_GOVERNANCE_ESCALATED`
- `ADOBE_WORKFLOW_CREATED`
- `ADOBE_SIMULATION_CREATED`
- `ADOBE_OUTCOME_RESOLVED`
- `ADOBE_REPLAY_VALIDATED`

Replay coverage must include:
- lifecycle replay
- workflow replay
- governance replay
- telemetry replay
- simulation replay
- outcome replay

## Runtime Integrity Inheritance

Adobe pack must inherit and satisfy existing runtime integrity controls:
- telemetry parity
- replay continuity
- lifecycle persistence
- workflow trace continuity
- correlation continuity
- orphan detection
- runtime consistency diagnostics

## Delivery Sequence (Recommended)

1. Evidence + normalization
2. Trust + reconciliation
3. Inactive reclaim
4. Rightsizing
5. Contractor cleanup
6. Renewal readiness
7. Outcome intelligence
8. Telemetry + replay integration

## Architecture Guardrail (Critical)

Adobe MUST remain a domain pack on top of the canonical runtime governance spine.  
No separate Adobe architecture is permitted.

## Adobe Phase B Update
- Added Phase B runtime maturity docs and playbook scope.
