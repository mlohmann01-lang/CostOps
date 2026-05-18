# M365 Expansion Pack 1 Recon

## CURRENT_M365_EVIDENCE_SURFACES
- M365 Graph read-only ingestion entities: users, assigned licenses/SKUs, sign-in activity, mailbox attributes, group membership, and tenant-scoped connector trust snapshots.
- Evidence normalization paths: `m365-evidence-normalization-service`, `m365-normalizer`, reconciliation adapters, and existing telemetry envelopes.
- Decision-intelligence-ready fields already modeled: trust inputs, evidence freshness indicators, target identity metadata, and savings placeholders.

## CURRENT_RECOMMENDATION_CAPABILITIES
- Existing playbook recommendation flow supports deterministic playbook evaluation, suppression, confidence/trust scoring, routing through recommendation arbitration, ranking, and replay lineage persistence.
- Existing recommendation payloads support risk class, execution mode, evidence references, verification method, rollback notes, and projected savings.
- Existing runtime guards enforce non-autonomous recommendation lifecycle with approval-compatible states.

## PLAYBOOK_DEPENDENCIES
- Playbook Engine (`base-playbook`, playbook registry, evaluation logs)
- Decision Intelligence Layer (conflict detection, sensitivity model, confidence engine, arbitration engine, ranking engine)
- Recommendation persistence + rationale/traceability services
- Outcome Ledger writer
- M365 evidence normalization and connector trust services
- Runtime resilience and tenant isolation controls

## REQUIRED_GRAPH_FIELDS
- Identity: `userPrincipalName`, `displayName`, `accountEnabled`, tenant identifiers.
- Licensing: assigned SKUs (including base and add-on mapping), unit pricing metadata.
- Activity: sign-in recency, workload usage mix, desktop activation/use, premium capability signals.
- Mailbox: mailbox type, delegation hints, legal/retention indicators.
- Ownership: manager/owner clues, employment/contractor hints, department/persona.
- Governance: privileged/admin/security role hints, sensitivity tags, trust freshness stamps.

## M365_SIGNAL_LIMITATIONS
- Some tenants may have sparse or delayed usage telemetry.
- Add-on and Copilot usage granularity may vary by workload and API availability.
- HR/contractor metadata is often incomplete or out-of-band.
- Executive/VIP and high-risk department tagging may require heuristic fallback.

## FALSE_POSITIVE_RISK_AREAS
- Recently reactivated users marked inactive from delayed sync.
- New Copilot assignees incorrectly treated as underutilized.
- Shared mailbox-like patterns on user mailboxes with real ownership.
- Add-on assignments tied to cyclical/seasonal projects.

## SENSITIVITY_RISK_AREAS
- Privileged identities, admins, service accounts.
- Executive/VIP users, legal/retention-sensitive mailboxes.
- Security/compliance users on E5 with non-obvious premium dependencies.
- Ambiguous contractor/leaver records without validated ownership.

## APPROVAL_ESCALATION_REQUIREMENTS
- All high-sensitivity candidates must resolve to `APPROVAL_REQUIRED` or be blocked.
- Ownership ambiguity must prefer review-oriented recommendations.
- Conflicting evidence and high blast-radius actions must not auto-promote.

## CROSS_PLAYBOOK_CONFLICT_RISKS
- Reclaim vs rightsize collisions on same principal/SKU window.
- Shared mailbox conversion colliding with reclaim or role-based rightsize.
- Contractor review overlap with inactive reclaim.
- E5 downgrade paired with add-on reclaim causing double-counted savings.
- Copilot underutilization overlap with enablement cohort exceptions.

## PLAYBOOK_SEQUENCING_RULES
1. Generate deterministic playbook candidates independently.
2. Run conflict detection before sensitivity/ranking promotion.
3. Apply sensitivity elevation and confidence scoring.
4. Arbitration suppresses unsafe or duplicate-savings candidates.
5. Ranking emits final recommendation order with stable tie-breakers.

## OUTCOME_LEDGER_REQUIREMENTS
- Persist final recommendation lineage with arbitration reasoning.
- Include confidence factors, evidence references, suppression/conflict metadata.
- Preserve replay continuity hashes and tenant-scoped determinism.
- Record non-destructive recommendation outcomes only.

## NON_NEGOTIABLE_BOUNDARIES
- Runtime modes limited to `READ_ONLY`, `RECOMMEND_ONLY`, `APPROVAL_REQUIRED`.
- No autonomous execution or direct Graph mutations.
- No new execution, telemetry, replay, workflow, or UI subsystems.
- Reuse existing platform authorities and tenant isolation primitives.
