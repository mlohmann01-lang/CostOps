# First Tenant Runbook

## Purpose

This runbook is the operating guide for onboarding and running the first live/design-partner tenant. It is written for Customer Success, Delivery, Security, Product Operations, and the customer sponsor. It does not introduce new product scope or platform architecture; it uses the existing Pilot Workspace, Onboarding, Connector Hub, Data Trust, Recommendations, Execution, Outcomes, Evidence Packs, and Executive Value Dashboard screens.

## Operating Principles

- Start read-only and prove value before controlled execution.
- Use the Pilot Workspace as the daily cockpit for status, value, evidence, and actions.
- Keep every gated phase customer-visible and customer-approved.
- Treat trust blockers, permission gaps, and rollback ambiguity as stop conditions.
- Capture evidence before and after material actions.
- Do not auto-execute for the first tenant.
- Convert pilot progress into executive-ready proof, not engineering detail.

## Required Platform Screens

| Screen | Runbook use |
| --- | --- |
| Pilot Workspace | Daily cockpit for tenant status, connector status, trust status, value, execution status, evidence packs, and open actions. |
| Onboarding | Tenant setup, M365 readiness, permission validation, discovery, and go-live checklist. |
| Connector Hub | Connector readiness, sync status, connector health, and connector blockers. |
| Data Trust | Trust score, trust findings, identity/permission/data blockers, and execution readiness. |
| Recommendations | Opportunity review, prioritization, approval readiness, and playbook candidate review. |
| Execution | Dry runs, approval-gated execution queue, controlled action status, and execution evidence. |
| Outcomes | Verified value, pending verification, failed verification, and outcome proof. |
| Evidence Packs | Customer proof package generation, export, and audit-ready evidence review. |
| Executive Value Dashboard | Executive value narrative, projected/verified value funnel, blockers, and executive review preparation. |

## Role Model

| Role | Primary responsibilities |
| --- | --- |
| Customer Sponsor | Confirms scope, success metrics, executive review date, and expansion decision. |
| Tenant Admin | Grants and validates tenant access and permissions. |
| Security Contact | Reviews access model, evidence handling, approvals, and risk controls. |
| Customer Success Manager | Owns cadence, Pilot Workspace review, customer checkpoints, action tracking, and closeout. |
| Delivery Lead | Owns runbook execution, dry-run sequencing, controlled execution coordination, and issue escalation. |
| Product/Operations Lead | Monitors platform readiness, trust blockers, evidence completeness, and executive value quality. |

## A. Pilot Readiness Checklist

Complete this checklist before the first discovery run.

| Readiness item | Owner | Status |
| --- | --- | --- |
| Customer sponsor confirmed | Customer Success Manager | Not started / Ready / Blocked |
| Tenant admin identified | Customer Success Manager | Not started / Ready / Blocked |
| Security contact identified | Customer Success Manager | Not started / Ready / Blocked |
| Test scope agreed | Customer Sponsor + Delivery Lead | Not started / Ready / Blocked |
| M365 permissions confirmed | Tenant Admin + Security Contact | Not started / Ready / Blocked |
| Commercial/pilot terms agreed | Customer Sponsor + Customer Success Manager | Not started / Ready / Blocked |
| Rollback expectations agreed | Delivery Lead + Security Contact | Not started / Ready / Blocked |
| Success metrics agreed | Customer Sponsor + Customer Success Manager | Not started / Ready / Blocked |
| Executive review date agreed | Customer Sponsor + Customer Success Manager | Not started / Ready / Blocked |

Go / No-Go rule: if sponsor, tenant admin, security contact, scope, permissions, rollback expectations, success metrics, or executive review date are not agreed, do not proceed beyond setup.

## Pilot Methodology and Implementation Playbook

The first tenant pilot moves through 16 gated phases. Each phase produces customer-facing output and evidence. A phase can be marked Ready, Needs attention, Blocked, Review required, Value identified, Value verified, or Evidence ready in the Pilot Workspace operating language.

### 1. Pre-Pilot Qualification

- **Purpose:** Confirm the customer is a valid design partner with executive sponsorship, a scoped tenant, measurable value goals, and agreed operating constraints.
- **Owner:** Customer Success Manager.
- **Inputs:** Customer sponsor, pilot scope, target tenant, commercial/pilot terms, security expectations, success metrics, executive review date.
- **Platform screens used:** Pilot Workspace, Executive Value Dashboard.
- **Actions:**
  - Confirm sponsor and tenant admin.
  - Confirm pilot scope and excluded systems/actions.
  - Document success metrics and executive review date.
  - Confirm that first-tenant execution is read-only first and approval-gated.
- **Success criteria:** Sponsor, scope, tenant admin, security contact, pilot terms, success metrics, and executive review date are confirmed.
- **Risks / blockers:** No sponsor, unclear scope, no tenant admin, no security contact, unresolved commercial terms.
- **Evidence captured:** Qualification notes, success metric list, pilot scope, agreed constraints.
- **Customer-facing output:** Customer Success Guide and pilot kickoff summary.

### 2. Tenant Access & Security Setup

- **Purpose:** Establish safe tenant access with security sign-off and a known escalation path.
- **Owner:** Delivery Lead with Tenant Admin and Security Contact.
- **Inputs:** Tenant identifier, admin contact, security contact, approved access model, pilot scope.
- **Platform screens used:** Onboarding, Pilot Workspace.
- **Actions:**
  - Start tenant onboarding.
  - Confirm read-only first operating mode.
  - Confirm security contact and escalation process.
  - Record material-action approval expectations.
- **Success criteria:** Tenant setup is visible in Onboarding and Pilot Workspace; security contact accepts the pilot access model.
- **Risks / blockers:** Access request rejected, wrong tenant selected, unclear security owner, missing escalation path.
- **Evidence captured:** Onboarding status, tenant setup record, security approval note.
- **Customer-facing output:** Security setup confirmation and next-step access request summary.

### 3. Connector Setup

- **Purpose:** Connect the agreed tenant data source for read-only discovery and status monitoring.
- **Owner:** Delivery Lead with Tenant Admin.
- **Inputs:** Tenant admin credentials/process, M365 connector requirements, agreed read-only scope.
- **Platform screens used:** Connector Hub, Onboarding, Pilot Workspace.
- **Actions:**
  - Configure the M365 connector in the approved mode.
  - Confirm connector appears in Connector Hub.
  - Review connector status in Pilot Workspace.
  - Record connector blockers or missing access.
- **Success criteria:** Connector appears in Connector Hub with health/readiness status and no unresolved critical setup blocker.
- **Risks / blockers:** Connector unavailable, incomplete consent, missing tenant admin, network/API access issue.
- **Evidence captured:** Connector readiness status, setup timestamp, connector blocker list.
- **Customer-facing output:** Connector setup status update.

### 4. Permission Validation

- **Purpose:** Confirm permissions are sufficient for read-only discovery and identify any permissions needed for later controlled execution.
- **Owner:** Delivery Lead with Security Contact and Tenant Admin.
- **Inputs:** Granted permissions, required read permissions, optional write/control permissions, security constraints.
- **Platform screens used:** Onboarding, Connector Hub, Data Trust, Pilot Workspace.
- **Actions:**
  - Run permission validation in Onboarding.
  - Review read readiness and write readiness separately.
  - Record missing permissions as open actions.
  - Confirm no controlled execution is attempted without approval and validated permissions.
- **Success criteria:** Read-only discovery permissions are Ready; missing controlled-execution permissions are documented and approved before use.
- **Risks / blockers:** Missing read permission, over-permission concern, security rejection, unclear execution permission boundary.
- **Evidence captured:** Permission validation result, readiness checklist, security notes.
- **Customer-facing output:** Permission validation summary with any Needs attention or Blocked items.

### 5. Discovery Run

- **Purpose:** Collect the first tenant discovery snapshot for opportunity identification and trust review.
- **Owner:** Delivery Lead.
- **Inputs:** Ready connector, validated read permissions, agreed scope.
- **Platform screens used:** Onboarding, Connector Hub, Pilot Workspace.
- **Actions:**
  - Run discovery from Onboarding.
  - Confirm snapshot completion and counts.
  - Confirm Pilot Workspace reflects updated tenant and connector status.
  - Escalate incomplete or stale discovery results.
- **Success criteria:** Discovery completes for the agreed scope and produces a current snapshot.
- **Risks / blockers:** Discovery fails, partial data, stale snapshot, unexpected tenant data coverage gap.
- **Evidence captured:** Discovery snapshot ID, completion timestamp, discovered counts, connector sync status.
- **Customer-facing output:** Discovery completion note and scope coverage summary.

### 6. Data Trust Review

- **Purpose:** Decide whether the discovered data is reliable enough for recommendation review, dry runs, and controlled action consideration.
- **Owner:** Product/Operations Lead with Security Contact.
- **Inputs:** Discovery snapshot, connector status, trust findings, identity/license/usage/activity/mailbox trust signals.
- **Platform screens used:** Data Trust, Pilot Workspace.
- **Actions:**
  - Review trust score, trust band, and trust findings.
  - Separate Ready, Needs attention, Review required, and Blocked findings.
  - Assign owners for trust blockers.
  - Stop execution planning for any action affected by a critical trust blocker.
- **Success criteria:** Trust status is Ready or accepted for review with documented constraints; critical blockers are resolved or excluded from pilot scope.
- **Risks / blockers:** Identity conflicts, missing owner, stale source, low-confidence usage data, connector degradation.
- **Evidence captured:** Trust review notes, finding list, blocker resolution decisions, excluded-scope notes.
- **Customer-facing output:** Data Trust review summary and blocker register.

### 7. Opportunity Review

- **Purpose:** Convert discovery and trust data into a prioritized customer opportunity list with projected value.
- **Owner:** Customer Success Manager with Product/Operations Lead.
- **Inputs:** Recommendations, trust status, projected savings, customer priorities, pilot scope.
- **Platform screens used:** Recommendations, Data Trust, Pilot Workspace, Executive Value Dashboard.
- **Actions:**
  - Review recommended opportunities with customer stakeholders.
  - Confirm which opportunities are in scope, out of scope, or review required.
  - Validate projected value and confidence language.
  - Identify early executive-value narrative.
- **Success criteria:** Customer agrees to a prioritized opportunity set and projected annual value is identified.
- **Risks / blockers:** Opportunity not relevant, value disputed, trust confidence too low, owner not available.
- **Evidence captured:** Reviewed opportunity list, projected value, customer decisions, excluded recommendations.
- **Customer-facing output:** Opportunity Review summary and value identified statement.

### 8. Playbook Selection

- **Purpose:** Select the operational playbooks/actions that are safe and meaningful for dry-run validation.
- **Owner:** Delivery Lead with Customer Sponsor and Security Contact.
- **Inputs:** Prioritized opportunities, trust readiness, rollback expectations, approval requirements.
- **Platform screens used:** Recommendations, Execution, Pilot Workspace.
- **Actions:**
  - Choose low-risk or clearly governed actions first.
  - Confirm each selected playbook has an owner, approval path, rollback expectation, and evidence requirement.
  - Exclude material actions until executive approval is explicit.
- **Success criteria:** Selected playbooks are approved for dry run and have clear risk/rollback/evidence expectations.
- **Risks / blockers:** No rollback path, material impact without executive approval, unclear owner, disputed scope.
- **Evidence captured:** Playbook selection list, risk notes, rollback expectation, approval owner.
- **Customer-facing output:** Implementation Playbook for selected pilot actions.

### 9. Dry Run

- **Purpose:** Validate the expected action, impact, risk, approval need, and evidence flow without changing the customer environment.
- **Owner:** Delivery Lead.
- **Inputs:** Selected playbooks, trust status, connector readiness, permission validation, rollback expectations.
- **Platform screens used:** Execution, Recommendations, Pilot Workspace.
- **Actions:**
  - Run dry runs for selected actions.
  - Review dry-run result, blocked reasons, expected savings, and pre-flight validation.
  - Capture customer questions and required changes.
  - Do not proceed to controlled execution until dry-run results are accepted.
- **Success criteria:** Dry runs complete and customer accepts the result or marks the action as blocked/out of scope.
- **Risks / blockers:** Dry run blocked, value differs from expectation, permission gap, trust blocker, rollback ambiguity.
- **Evidence captured:** Dry-run result, pre-flight validation, expected before/after state, blocked reason if applicable.
- **Customer-facing output:** Dry-run review summary.

### 10. Approval Review

- **Purpose:** Obtain explicit customer sign-off for any action moving from dry run to controlled execution.
- **Owner:** Customer Success Manager with Customer Sponsor and Security Contact.
- **Inputs:** Dry-run results, risk notes, projected value, evidence plan, rollback plan where applicable.
- **Platform screens used:** Execution, Recommendations, Pilot Workspace.
- **Actions:**
  - Review each dry-run result with required approvers.
  - Confirm material actions have executive approval.
  - Record Go / No-Go decision per action.
  - Keep rejected or deferred actions visible as closeout learning.
- **Success criteria:** Approved actions have explicit customer sign-off; rejected/deferred actions have documented rationale.
- **Risks / blockers:** Missing approver, material action lacks executive approval, risk not accepted, rollback plan not accepted.
- **Evidence captured:** Approval decision, approver identity/role, approval timestamp, rejected/deferred rationale.
- **Customer-facing output:** Approval Review log and Go / No-Go action list.

### 11. Controlled Execution

- **Purpose:** Execute only approved, gated, customer-signed-off actions under controlled conditions.
- **Owner:** Delivery Lead with Security Contact oversight.
- **Inputs:** Approved actions, validated permissions, accepted dry-run result, rollback plan where applicable, scheduled execution window.
- **Platform screens used:** Execution, Pilot Workspace.
- **Actions:**
  - Confirm pre-flight validation immediately before execution.
  - Execute only approved actions.
  - Monitor execution state and capture result.
  - Stop if unexpected status, trust degradation, permission failure, or customer escalation occurs.
- **Success criteria:** Controlled execution completes or is safely stopped with clear status and evidence.
- **Risks / blockers:** Permission failure, unexpected tenant change, action blocked, customer escalation, rollback requirement.
- **Evidence captured:** Execution request, execution result, before/after reference, rollback status where applicable.
- **Customer-facing output:** Controlled Execution status update.

### 12. Verification

- **Purpose:** Confirm whether executed actions produced verified customer value and operational proof.
- **Owner:** Product/Operations Lead with Delivery Lead.
- **Inputs:** Execution results, outcome ledger, post-action telemetry/snapshots, expected value.
- **Platform screens used:** Outcomes, Execution, Pilot Workspace.
- **Actions:**
  - Review verified, pending, failed, and drifted outcomes.
  - Compare projected value with verified value.
  - Investigate pending or failed verification.
  - Mark verified value as customer-ready only when proof is sufficient.
- **Success criteria:** Verified outcomes are confirmed or pending/failed outcomes have clear next actions.
- **Risks / blockers:** Verification data missing, value not realized, drift detected, evidence insufficient.
- **Evidence captured:** Outcome proof, verification status, value variance, supporting evidence.
- **Customer-facing output:** Verification summary and value verified statement.

### 13. Evidence Pack Generation

- **Purpose:** Package pilot proof for customer, security, finance, and executive review.
- **Owner:** Customer Success Manager with Product/Operations Lead.
- **Inputs:** Discovery evidence, trust review, opportunities, dry runs, approvals, executions, outcomes, verification proof.
- **Platform screens used:** Evidence Packs, Outcomes, Executive Value Dashboard, Pilot Workspace.
- **Actions:**
  - Generate evidence pack for the tenant/pilot scope.
  - Review completeness, export availability, and proof status.
  - Confirm evidence includes before/after capture for material actions.
  - Share customer-ready evidence package.
- **Success criteria:** Evidence pack is generated, reviewed, export-ready, and acceptable for executive review.
- **Risks / blockers:** Evidence incomplete, verification missing, export unavailable, disputed proof.
- **Evidence captured:** Evidence pack ID, completeness score/status, export links, included proof chain.
- **Customer-facing output:** Evidence Pack Flow and exported evidence package.

### 14. Executive Value Review

- **Purpose:** Present projected value, verified value, confidence, evidence, blockers, and expansion recommendation to executives.
- **Owner:** Customer Success Manager with Customer Sponsor.
- **Inputs:** Executive value summary, evidence pack, verified outcomes, open blockers, closeout recommendation.
- **Platform screens used:** Executive Value Dashboard, Evidence Packs, Pilot Workspace.
- **Actions:**
  - Prepare executive narrative.
  - Review projected annual savings identified and verified annual savings confirmed.
  - Explain confidence, blockers, and next-best actions in business language.
  - Document executive feedback and decision path.
- **Success criteria:** Executive review is completed with clear decision options: Expand, Continue, Pause, or Stop.
- **Risks / blockers:** Value not verified, evidence incomplete, sponsor unavailable, decision maker not present.
- **Evidence captured:** Executive review deck/notes, value funnel, decision record, evidence pack reference.
- **Customer-facing output:** Executive Review Flow and pilot value review summary.

### 15. Drift Prevention / Ongoing Governance

- **Purpose:** Prevent value decay and define how the customer will govern future actions after the first pilot cycle.
- **Owner:** Product/Operations Lead with Customer Success Manager.
- **Inputs:** Verified outcomes, drift signals, governance expectations, approval model, customer operating cadence.
- **Platform screens used:** Outcomes, Data Trust, Evidence Packs, Executive Value Dashboard, Pilot Workspace.
- **Actions:**
  - Review drift risk for verified outcomes.
  - Agree monitoring and governance expectations.
  - Confirm approval-gated execution remains in place unless customer explicitly changes operating model later.
  - Document recurrence-prevention controls.
- **Success criteria:** Customer agrees to drift controls and ongoing governance cadence.
- **Risks / blockers:** No owner for ongoing governance, drift controls not accepted, unresolved trust issues.
- **Evidence captured:** Drift-control agreement, governance notes, ongoing owner list.
- **Customer-facing output:** Drift prevention and ongoing governance plan.

### 16. Pilot Closeout / Expansion Decision

- **Purpose:** Decide whether to expand, continue, pause, or stop the pilot based on value, trust, evidence, and customer readiness.
- **Owner:** Customer Sponsor with Customer Success Manager.
- **Inputs:** Pilot success metrics, evidence pack, executive review output, unresolved blockers, governance plan.
- **Platform screens used:** Pilot Workspace, Executive Value Dashboard, Evidence Packs, Outcomes.
- **Actions:**
  - Review the pilot scorecard.
  - Confirm which success metrics were met.
  - Review unresolved blockers and risks.
  - Select Expand, Continue, Pause, or Stop.
  - Document next operating model and ownership.
- **Success criteria:** Closeout decision is documented and accepted by customer sponsor.
- **Risks / blockers:** No decision maker, disputed value, incomplete evidence, unresolved security concern.
- **Evidence captured:** Closeout scorecard, decision record, expansion/pause/stop rationale.
- **Customer-facing output:** Pilot closeout summary and expansion decision record.

## B. First Tenant Success Metrics

Track these in the Pilot Workspace and executive review materials.

| Metric | Definition | Target handling |
| --- | --- | --- |
| Projected annual savings identified | Annualized value from reviewed recommendations/opportunities. | Required for Value identified. |
| Verified annual savings confirmed | Annualized value confirmed through Outcomes and evidence. | Required for Value verified. |
| Number of opportunities reviewed | Count of customer-reviewed opportunities. | Report in Opportunity Review. |
| Number of dry-runs completed | Count of dry runs completed without tenant mutation. | Report before Approval Review. |
| Number of approved actions | Count of customer-approved controlled actions. | Report before execution. |
| Number of verified outcomes | Count of outcomes with verified proof. | Report in Verification and Executive Value Review. |
| Evidence pack generated | Evidence pack exists and is export-ready. | Required for Evidence ready. |
| Executive review completed | Executive sponsor review completed with decision path. | Required for closeout. |
| Drift controls agreed | Ongoing governance and recurrence-prevention controls accepted. | Required for expansion recommendation. |

## C. Risk Controls

The first tenant operating model requires these controls:

- **Read-only first:** discovery and trust review precede any controlled action.
- **Approval-gated execution:** no action moves to execution without explicit customer approval.
- **No auto-execution for first tenant:** automated execution is not part of first-tenant operation.
- **Pre-flight validation:** validate connector health, permissions, trust status, and execution readiness immediately before dry run and execution.
- **Dry-run before execution:** every controlled action must have a reviewed dry-run result.
- **Rollback plan where applicable:** material or reversible actions require a documented rollback expectation before approval.
- **Evidence before/after capture:** material actions require pre-action and post-action evidence.
- **Executive approval for material actions:** customer executive approval is required where business impact is material.
- **Customer sign-off at every gated stage:** setup, discovery, trust review, opportunity review, dry run, approval, execution, verification, evidence, and closeout are gated by customer-visible sign-off.

## D. Pilot Closeout Decision

| Decision | Use when | Next action |
| --- | --- | --- |
| Expand | Value is verified, evidence is ready, sponsor is satisfied, and governance controls are agreed. | Define expanded scope, cadence, and owner model. |
| Continue | Value is promising but more verification, evidence, or stakeholder review is needed. | Continue within agreed pilot scope with specific next checkpoints. |
| Pause | Security, trust, permission, evidence, or stakeholder blockers prevent responsible progress. | Pause actions, resolve blockers, and set restart criteria. |
| Stop | Value is not relevant, blockers cannot be resolved, or customer no longer wants to proceed. | Close evidence, document learning, and end pilot operations. |

## E. Internal Delivery Cadence

| Cadence | Participants | Purpose | Output |
| --- | --- | --- | --- |
| Daily internal check | Customer Success Manager, Delivery Lead, Product/Operations Lead | Review Pilot Workspace, blockers, open actions, customer commitments, and next customer touch. | Internal action list and escalation needs. |
| Customer checkpoint cadence | Customer Success Manager, Delivery Lead, customer sponsor/delegates | Review status, decisions needed, blockers, and proof produced. | Customer-facing checkpoint notes. |
| Executive review cadence | Customer Sponsor, Customer Success Manager, executive stakeholders | Review value, evidence, risk, and expansion decision. | Executive review summary and decision record. |
| Issue escalation path | Delivery Lead, Security Contact, Product/Operations Lead, Customer Sponsor as needed | Resolve permission, trust, execution, evidence, or decision blockers. | Escalation owner, target date, and resolution record. |

## Required Outputs

### Customer Success Guide

A customer-facing summary of pilot scope, roles, cadence, success metrics, risk controls, and decision gates. It should be maintained by the Customer Success Manager and reviewed at kickoff.

### Pilot Methodology

The 16-phase flow in this runbook is the pilot methodology. It explains how the pilot moves from qualification through closeout without adding product scope or hidden engineering steps.

### Implementation Playbook

The implementation playbook is the selected action list from Playbook Selection, with owner, approval path, dry-run result, rollback expectation, controlled execution status, verification result, and evidence pack reference.

### Executive Review Flow

The executive review flow uses the Executive Value Dashboard and Evidence Packs to present projected value, verified value, confidence, blockers, proof, and the closeout recommendation.

### Evidence Pack Flow

The evidence pack flow starts during discovery and ends when Evidence Packs produce a customer-ready proof package containing discovery, trust, opportunity, approval, execution, verification, and outcome evidence.

### Go / No-Go Criteria

A phase is Go only when the owner, required inputs, platform evidence, customer-facing output, and success criteria are complete. A phase is No-Go when trust, permission, approval, rollback, evidence, or customer sign-off is missing.

## Final Note

After this runbook exists, the next dependency is not engineering. It is securing a live tenant/design partner.
