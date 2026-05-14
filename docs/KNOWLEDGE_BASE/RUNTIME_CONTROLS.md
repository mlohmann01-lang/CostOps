# RUNTIME CONTROLS

## Enforcement status
Runtime controls are **enforcement-path controls**. They are no longer scaffold-only checks.

## Decision contract
Runtime controls can emit only:
- `ALLOW`
- `WARN` (pass-through, execution continues, evidence required)
- `REQUIRE_APPROVAL_ESCALATION` (pass-through with escalation marker)
- `BLOCK` (hard deny)
- `QUARANTINE` (hard deny)

## Non-override guarantees
Runtime controls do **not** override Trust, Risk, AuthN/AuthZ, Approval workflow, or Policy outcomes. They add additional guardrail decisions in the execution path.

## Required behavior
- `BLOCK` and `QUARANTINE` remain denial behavior.
- `WARN` remains pass-through behavior with attached evidence.
- Platform events are emitted for runtime-control outcomes (`WARN`, `BLOCK`, `QUARANTINE`, escalation).

## Operational notes
Event persistence is best-effort: emission is attempted for every runtime-control decision, and persistence failures are handled without weakening enforcement decisions.
