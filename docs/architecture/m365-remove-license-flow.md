# M365 REMOVE_LICENSE End-to-End Flow

## Sequence (Canonical)
1. **Discovery**
   - M365 evidence sync identifies reclaim candidates with entitlement + activity context.
2. **Recommendation**
   - Governed recommendation generated with projected monthly/annual savings, trust score, and risk class.
3. **Approval**
   - Policy/governance checks determine approval requirements; approval workflow records decision.
4. **Execution Request**
   - Request created with idempotency key, expiry, policy blockers, and rollback requirements.
5. **Dry Run**
   - Simulated action validates impact and rollback support; no provider mutation.
6. **Execute**
   - Governed execution path runs only when policy, approval, and runtime controls pass.
7. **Verify**
   - Outcome verifier checks license removal, user validity, projected vs realized savings, rollback evidence, and policy posture.
8. **Ledger**
   - Outcome ledger records economic proof and contributes to rollups (verified savings, variance, drift posture).

## Text Sequence Diagram
- Discovery Service -> Recommendation Engine: candidate evidence
- Recommendation Engine -> Governance: governed recommendation
- Governance -> Approval Workflow: approval request
- Approval Workflow -> Execution Orchestrator: approved request
- Execution Orchestrator -> Dry Run Engine: simulate action
- Dry Run Engine -> Execution Orchestrator: simulation evidence
- Execution Orchestrator -> Connector Write Client: execute remove-license (gated)
- Connector Write Client -> Execution Result Store: execution evidence + rollback reference
- Outcome Verification Service -> Connector Read Evidence: post-execution verification checks
- Outcome Verification Service -> Outcome Ledger: verified/proof record
- Drift Monitor -> Outcome Ledger/Governance: drift status and events

## Guardrails
- No automatic remediation.
- No automatic rollback.
- No bypass around approval chain.
- Deterministic evidence and auditability across each stage.
