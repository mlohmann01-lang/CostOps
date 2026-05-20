# Semantic Engine Deepening Recon

Replaces placeholder semantics previously implemented as scaffold-only constants and smoke tests.

## Semantic depth standards
- Every semantic module must encode deterministic rule decisions and typed inputs/outputs.
- Tests must assert behavior (blocking/escalation/aggregation), not existence.

## Rules by area
- Connector action realism: full semantic profiles per action with risk/reversibility/evidence/preflight/postflight/manual-only logic.
- Transaction realism: bounded retry, stale-state blocking, permission drift detection, duplicate-request detection, postflight mismatch detection.
- Partial failure realism: explicit classifier and failure-state impacts on savings/governance.
- Rollback dependency realism: reverse execution ordering, blocker detection, proof continuity.
- Multi-step execution realism: weakest-step verdict and highest-tier approval control.
- Runtime integration: certify/execute/verify/replay behavior must change based on semantic outcomes.

## Explicit rejections
- more scaffold-only modules
- assert.equal(1,1) tests
- Object.freeze({ deterministic: true }) as sufficient implementation
- broad abstraction expansion
- hidden mutation
- orchestration drift
