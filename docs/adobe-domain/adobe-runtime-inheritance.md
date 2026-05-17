# Adobe Runtime Inheritance

- Telemetry inherits `OperationalTelemetryService.emitEvent` using `emitAdobeEvent`.
- Lifecycle/replay inheritance remains in `PlaybookRecommendationService` trace persistence and replay report logic.
- Adobe playbooks run through the same `PlaybookRecommendationService` path and canonical recommendation tables.
- No Adobe-specific orchestration/replay/workflow subsystems were introduced.
