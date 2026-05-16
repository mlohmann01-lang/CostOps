# Execution Boundary Authority

- Execution authority: `execution-orchestration-service.ts`.
- Only execution/orchestration routes may call execution authority.
- Recommendation/simulation/workflow/governance/outcome services must not execute actions directly.
- Required gates before execution: governance decision + approval state + trust/readiness controls.
- Prohibited: direct imports of execution engine in recommendation/simulation/workflow routes.
